import React, { Component } from 'react';
import {
  ActivityIndicator,
  AppRegistry,
  StyleSheet,
  View,
  Button,
  Alert,
  Dimensions,
  Image,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import DrawCanvas from './components/DrawCanvas';
import UserCanvas from './components/UserCanvas';
import { FontAwesome5 } from '@expo/vector-icons';

import Slider from '@react-native-community/slider';
// import Snackbar from 'react-native-snackbar';
import axios from 'axios';
import colorMap from './constants/colorMap.js';
import brushTypes from './constants/brushTypes.js';
import userBrushes from './constants/userBrushes.js';
import styleTransferOptions from './constants/styleTransferOptions.js';
import userBrushesOptions from './constants/userBrushesOptions.js';
import messageKinds from './constants/messageKinds.js';
import {
  onOpen,
  onClose,
  onMessage,
  onError,
  sendStroke,
  sendStrokeEnd,
  sendStrokeStart,
} from './api/websocketApi.js';
import { sendRequest, sendRequestStyle } from './api/modelApi.js';
import { hello, generateStyle } from './styles/styles.js';
import Point from './classes/Point';
import { startClock } from 'react-native-reanimated';
import { ScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import ColorPicker from 'react-native-wheel-color-picker';
import Spinner from 'react-native-loading-spinner-overlay';
import {
  BallIndicator,
  BarIndicator,
  DotIndicator,
  MaterialIndicator,
  PacmanIndicator,
  PulseIndicator,
  SkypeIndicator,
  UIActivityIndicator,
  WaveIndicator,
} from 'react-native-indicators';
import { triggerBase64Download } from 'react-base64-downloader';

import backendConstants from './constants/backendUrl';


var device = Dimensions.get('window');
const CANVASWIDTH = device.width * 0.33;
const CANVASHEIGHT = device.width * 0.33;

// Connect to Go backend
// for web
// for android
// let this.state.socket = new WebSocket('ws://10.0.2.2:8080/ws');

// Create dynamic style based on device width/height
// const styles = StyleSheet.create(generateStyle(device));

export default class App extends Component {




  // React state: store the image data
  state = {
    imageData: 'data:image/png;base64,', // raw image data of the segmentation image
    generatedImageData: 'data:image/png;base64,', // raw image data of the generated image
    stylizedImageData: 'data:image/png;base64,', // raw image data of stylized generated image
    displayedImageData: 'data:image/png;base64,', // raw image data of displayed image
    style: 'none', // selected style
    color: '#384f83', // pen color
    userBrushColor: "#00FF00",
    userBrushBase64: "data:image/png;base64,", // user brush 
    userBrushType: userBrushes.PENCIL,
    styleBrushType: 'None',
    thickness: 10, // stroke thickness
    ownStroke: [], // client stroke data
    collaboratorStroke: [], // collaborator data
    opacity: 1, // Toggle between the drawing canvas and generated image. 

    // 1 = show drawing canvas, 0 = show image
    // socket: new WebSocket('ws://localhost:8080/ws')
    socket:
      Platform.OS === 'web'
        ? new WebSocket(`ws://${backendConstants.BACKEND_URL}:8080/ws`)
        : new WebSocket(`ws://${backendConstants.BACKEND_URL}:8080/ws`),
    canvasWidth: CANVASWIDTH,
    canvasHeight: CANVASHEIGHT,
    currentBrush: brushTypes.AI,

    isLoading: true //for loading spinner
  };

  constructor(props) {
    super(props);
    this.sendRequestHelper = this.sendRequestHelper.bind(this);
  }

  // Run when component is first rendered
  componentDidMount() {
    console.log('Attempting connection');

    // Setup this.state.socket handlers
    this.state.socket.onopen = () => {
      console.log(
        'CANVAS DIMS ARE',
        this.state.canvasWidth,
        this.state.canvasHeight,
      );

      onOpen(this.state.socket, {
        canvasWidth: this.state.canvasWidth,
        canvasHeight: this.state.canvasHeight,
      });
    };
    this.state.socket.onclose = event => {
      onClose(event);
    };
    this.state.socket.onerror = error => {
      onError(error);
    };

    this.state.socket.onmessage = event => {
      this.onMesageHandler(event);
    };

    this.setState(
      prevState => ({
        ...prevState,
        isLoading: false,
      }))

  }

  // Fetch image data from canvas
  // Then call sendRequest to send the data to backend
  grabPixels = async () => {

    this.setState(
      prevState => ({
        ...prevState,
        isLoading: true,
      }))
    var getImage = this.refs.drawCanvasRef.getBase64().then(value => {
      var resultImage = value.split(';base64,')[1];
      console.log('result image is', resultImage);
      this.setState(
        prevState => ({
          ...prevState,
          imageData: resultImage,
        }),
        // Do callback to send to server after the imageData is set
        this.sendRequestHelper,
      );
    });
  };

  // Send request to model server to generate painting
  sendRequestHelper = async () => {
    this.setState(
      prevState => ({
        ...prevState,
        isLoading: true,
      }))

    this.state.socket.send(
      JSON.stringify({
        kind: messageKinds.MESSAGE_GENERATE,
        data: {
          imageData: this.state.imageData,
        },
      }),
    );
  };
  // Send a request to the model server to stylize the generated painting
  sendRequestStyleHelper = async newStyle => {
    this.setState(
      prevState => ({
        ...prevState,
        isLoading: true,
      }))

    this.state.socket.send(
      JSON.stringify({
        kind: messageKinds.MESSAGE_STYLIZE,
        data: {
          imageData: this.state.generatedImageData,
          style: newStyle,
        },
      }),
    );
  };

  saveGeneratedImage = () => {
    var getImage = this.refs.userCanvasRef.getBase64().then(value => {

      var resultImage = value.split(';base64,')[1];
      var foregroundImageDataStripped = this.state.displayedImageData.split(';base64,')[1];
      this.setState(
        prevState => ({
          ...prevState,
          isLoading: true,
        }))
      this.state.socket.send(
        JSON.stringify({
          kind: messageKinds.MESSAGE_SAVE,
          data: {
            displayedImageData: foregroundImageDataStripped,
            userCanvasImageData: resultImage,
            aiCanvasImageData: this.state.imageData
          },
        }),
      );
    });
  };
  

  handleThickness = sliderValue => {
    this.setState(prevState => ({
      ...prevState,
      thickness: sliderValue,
    }));
    console.log('thickness is now', sliderValue);
  };

  onMesageHandler = event => {
    var messages = event.data.split('\n');

    for (var i = 0; i < messages.length; i++) {
      var message = JSON.parse(messages[i]);
      // console.log('Received message is', message);
      this.executeMessage(message);
    }
    // console.log('B stringified is', JSON.stringify(this.canvas.getPaths()));
  };

  executeMessage = message => {
    switch (message.kind) {
      case messageKinds.MESSAGE_STROKE_START:
        console.log('RECEIVED STROKE STARTT', message);
        // Append collaborator stroke
        this.setState(prevState => ({
          ...prevState,
          collaboratorStroke: [
            ...prevState.collaboratorStroke,
            new Point(
              message.point.x * CANVASWIDTH,
              message.point.y * CANVASHEIGHT,
              message.thickness,
              message.color,
              'start',
            ),
          ],
        }));

        break;
      case messageKinds.MESSAGE_STROKE:
        // console.log("received collaborator point", message)
        // Append collaborator stroke
        this.setState(prevState => ({
          ...prevState,
          collaboratorStroke: [
            ...prevState.collaboratorStroke,
            new Point(
              message.point.x * CANVASWIDTH,
              message.point.y * CANVASHEIGHT,
              message.thickness,
              message.color,
              'move',
            ),
          ],
        }));
        break;
      case messageKinds.MESSAGE_STROKE_END:
        this.setState(prevState => ({
          ...prevState,
          collaboratorStroke: [],
        }));

        break;
      // User receives a generated image broadcasted from another user
      case messageKinds.MESSAGE_GENERATE:
        console.log('got generate mesage here', message);
        this.setState(prevState => ({
          ...prevState,
          generatedImageData: message.imageData,
          displayedImageData: message.imageData,
        }));

        this.setState(
          prevState => ({
            ...prevState,
            isLoading: false,
          }))

        break;
      // User received a stylized image broadcasted from another user
      case messageKinds.MESSAGE_STYLIZE:
        console.log('image stylize', message);
        this.setState(prevState => ({
          ...prevState,
          style: message.style,
          stylizedImageData: message.imageData,
          displayedImageData: message.imageData,
        }));




        this.setState(
          prevState => ({
            ...prevState,
            isLoading: false,
          }))

        break;

        case messageKinds.MESSAGE_SAVE:
          this.setState(
            prevState => ({
              ...prevState,
              isLoading: false,
            }))
            console.log("RESP IS ", this.state.imageData)

            // FIXME: Will probably only work on expo web, untested on android/ios
            if (message.savedImageData != '')
            {
            triggerBase64Download(message.savedImageData, `Painting`)
            }
            break;
    }
  };




  render() {
    let brushSlider =
      <View style={{ flexDirection: "column", padding: 5 }}>
        <View>
        <Text
          style={{ textAlign:"center", fontSize: 18, padding: 2 }}
        >Size
        </Text>
        </View>

        <Slider
          style={{
            width: 150,
            margin: 'auto',
            height: device.height * 0.03,
          }}
          value={this.state.thickness}
          minimumValue={1}
          maximumValue={
            CANVASWIDTH / 4
          }
          minimumTrackTintColor="#000000"
          maximumTrackTintColor="#000000"
          onValueChange={this.handleThickness}
        />
        <View style={{ height: device.height * 0.18, marginBottom: "0.5em" }}>
          <Ionicons style={{ margin: "auto" }} 
                    name="ellipse" 
                    color={this.state.currentBrush == brushTypes.USER ? this.state.userBrushColor : this.state.color} 
                    size={this.state.thickness}></Ionicons>

        </View>


      </View>;




    return (
      <View style={styles.container}>

        {/* Da Brush~ */}
        <View>
          <TouchableOpacity onPress={() => this.setState(
            prevState => ({
              ...prevState,
              currentBrush: brushTypes.AI,
            }))} >
            <Image style={[styles.brushes, { opacity: this.state.currentBrush == brushTypes.AI ? 1 : 0.72 }]}
              source={require('./resources/AIBrush.png')} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => this.setState(
            prevState => ({
              ...prevState,
              currentBrush: brushTypes.STYLE,
            }))}>
            <Image style={[styles.brushes, { opacity: this.state.currentBrush == brushTypes.STYLE ? 1 : 0.72 }]}
              source={require('./resources/styleBrush.png')} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => this.setState(
            prevState => ({
              ...prevState,
              currentBrush: brushTypes.USER,
            }))}>
            <Image style={[styles.brushes, { opacity: this.state.currentBrush == brushTypes.USER ? 1 : 0.72 }]}
              source={require('./resources/userBrush.png')} />
          </TouchableOpacity>

          <Button
          title="Save painting"
          onPress={() => this.saveGeneratedImage()}
          >
            
          </Button>

        </View>

        <View id="drawGroup" style={styles.drawGroup}>
          <View style={styles.shadowBox}>
            <DrawCanvas
              ref="drawCanvasRef"
              setClickClear={click => this.clearChildAIBrush = click}
              style={{ backgroundColor: "black", position: "absolute", background: 'transparent' }}
              brushType={this.state.currentBrush}
              thickness={this.state.thickness}
              color={this.state.color}
              socket={this.state.socket}
              otherStrokes={this.state.collaboratorStroke}
              width={CANVASWIDTH}
              height={CANVASHEIGHT}
              opacity={1}
            />
          </View>
        </View>

        <View id="drawGroup" style={styles.drawGroup}>

          {/* Displayed image */}
          <View style={styles.generatedImageBox}>
            {this.state.displayedImageData != null ? (
              <Image
                draggable={false}
                style={styles.generatedImage}
                source={{ uri: this.state.displayedImageData }}
              />
            ) : null}
          </View>
          {/* Main canvas */}
          {/* Conditionally render the main canvas if toggleDraw == true */}

          <View style={styles.shadowBox}>
            
            {/* USER BRUSH */}
            <UserCanvas
              ref="userCanvasRef"
              setClickClear={click => this.clearChildUserBrush = click}
              style={{ position: "absolute", background: 'transparent' }}
              brushType={this.state.currentBrush}
              userBrushType={this.state.userBrushType}
              thickness={this.state.thickness}
              color={this.state.userBrushColor}
              socket={this.state.socket}
              otherStrokes={this.state.collaboratorStroke}
              width={CANVASWIDTH}
              height={CANVASHEIGHT}
              opacity={this.state.opacity}
              id="myCanvas"
            />
          </View>

        </View>


        <View style={{ flexDirection: 'row', }}>

          {/* AI brush palette buttons */}
          {(this.state.currentBrush == brushTypes.AI) &&
            <View style={styles.brushesContainer}>

              <ScrollView>
                {colorMap.colors.map(obj => {
                  return (
                    <View style={{ margin: 0 }}>
                      <TouchableOpacity
                        style={{
                          padding: 4,
                          borderTopLeftRadius: this.state.color == obj.color ? 0 : 5,
                          borderBottomLeftRadius: this.state.color == obj.color ? 0 : 5,
                          borderTopRightRadius: 5,
                          borderBottomRightRadius: 5,
                          backgroundColor: obj.color,
                          borderLeftWidth: this.state.color == obj.color ? 10 : 0,
                          borderColor: obj.color == '#efefef' ? 'grey' : '#8a8a8a',
                        }}
                        onPress={() => {
                          this.setState({ color: obj.color });
                        }}>

                        <Image
                          draggable={false}
                          style={styles.brushes} source={obj.logo} />
                        <Text
                          style={{
                            color: obj.color == '#efefef' ? '#3d3d3d' : 'white',
                            fontSize: device.height * 0.025,
                          }}>
                          {obj.label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Render the slider and the brush legend */}




              {brushSlider}

              <View style={{width:"100%", marginBottom: "0.00em", padding: 5}}>
                <Button
                  mode="contained"
                  style={{padding: 10}}
                  onPress={this.grabPixels.bind(this)}
                  color="#88508c"
                  title="generate"
                />
                </View>

              <View style={{ width: "100%", padding: 5}}>
                <Button style={{ marginTop: 10, height: "80"}} color="#5e748a" title="clear"
                    onPress={() => this.clearChildAIBrush()}
                />
              </View>

            </View>

          }

          {/* Style buttons */}

          {this.state.currentBrush == brushTypes.STYLE &&

            <View style={styles.brushesContainer}>
              {/* None style button */}
              <ScrollView>
                <View style={{ margin: 2 }}>
                  <TouchableOpacity
                    style={[styles.functionButton, { backgroundColor: this.state.styleBrushType == 'None' ? '#3d3d3d' : 'grey' }]}
                    onPress={() => {
                      this.setState(prevState => ({
                        ...prevState,
                        displayedImageData: this.state.generatedImageData,
                        styleBrushType: 'None',
                      }));
                    }}>
                    <Image style={styles.brushes} source={require('./resources/none_style.png')} />
                    <Text style={{ color: 'white', fontSize: 20 }}> None </Text>
                  </TouchableOpacity>
                </View>
                {/* Programmatically render all style options */}
                {styleTransferOptions.styles.map(obj => {
                  return (
                    <View style={{ margin: 2 }}>
                      <TouchableOpacity
                        style={[styles.functionButton, { backgroundColor: this.state.styleBrushType == obj.name ? '#3d3d3d' : 'grey' }]}
                        onPress={() => {
                          this.sendRequestStyleHelper(obj.name);
                          this.setState(prevState => ({
                            styleBrushType: obj.name,
                          }))
                        }}>

                        <Image style={styles.brushes} source={obj.image_url} />
                        <Text
                          style={{
                            color: 'white',
                            fontSize: device.height * 0.024,
                          }}>
                          {obj.label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

          }
        </View>


        {/* User Brush buttons */}

        {this.state.currentBrush == brushTypes.USER &&
          <View style={styles.brushesContainer}>
            <View style={{ height: device.height * 0.4 }}>
              <ScrollView>
                {/* Programmatically render all options */}
                {userBrushesOptions.userBrushes.map(obj => {
                  return (
                    <View style={{ margin: 2, }}>
                      <TouchableOpacity

                        style={[styles.functionButton, { backgroundColor: this.state.userBrushType == obj.name ? '#999999' : 'white' }]}
                        onPress={() => {
                          this.setState(prevState => ({
                            ...prevState,
                            userBrushType: obj.name,
                          }))
                        }}>

                        <Image style={styles.userBrushes} source={obj.image_url} />
                        <Text
                          style={{
                            color: this.state.userBrushType == obj.name ? 'white' : 'grey',
                            fontSize: device.height * 0.024,
                          }}>
                          {obj.label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>


            {/* Render the slider and the brush legend */}
            <View
              style={{ heigth: device.height * 0.1, }}>
              <ColorPicker
                ref={r => { this.picker = r }}
                // color={this.state.currentColor}
                // swatchesOnly={this.state.swatchesOnly}
                // onColorChange={this.onColorChange}
                onColorChangeComplete={(color) => {
                  this.setState(prevState => ({
                    ...prevState,
                    userBrushColor: color,
                  }));
                  console.log("colir is", color)
                }}
                color={this.state.userBrushColor}
                thumbSize={20}
                sliderSize={20}
                noSnap={true}
                row={false}
              // swatchesLast={this.state.swatchesLast}
              // swatches={this.state.swatchesEnabled}
              // discrete={this.state.disc}
              />

            </View>
            {brushSlider}

            <View style={[{ width: "100%"}]}>

              <Button color="#717591" title="clear strokes"
                onPress={() => this.clearChildUserBrush()}
              />
            </View>
          </View>
        }

        {/* Spinner is recommended to be at the root level */}
        <View style={styles.spinnerContainer}>
          <ActivityIndicator
            animating={this.state.isLoading}
            size={"large"}
            color={"#545454"}
            style={{ transform: [{ scale: 3 }] }}
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
  },
  generatedImageBox: {
    userDrag: 'none',
    userSelect: 'none',
    borderWidth: 8,
    backgroundColor: 'transparent',
    borderColor: '#fffef5',
    width: CANVASWIDTH,
    height: CANVASHEIGHT,
    position: 'absolute'
  },
  generatedImage: {
    width: "100%",
    height: "100%",
    userDrag: 'none',
    userSelect: 'none',
  },
  shadowBox: {
    shadowColor: 'grey',
    shadowRadius: 20,
    width: CANVASWIDTH,
    height: CANVASHEIGHT,
    position: 'relative'
  },
  functionButton: {
    padding: 4,
    borderRadius: 5,
  },

  drawGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'

  },
  strokeGroup: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  toolGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  brushes: {
    margin: 0,
    height: 100,
    width: 180,
    padding: 0,
    userDrag: 'none',
    userSelect: 'none',
  },
  brushesContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: device.height,
    borderLeftColor: "#C8C8C8",
    backgroundColor: "#f2f2eb",
    borderLeftWidth: 3,
  },
  userBrushes: {
    justifyContent: 'start',
    margin: 0,
    height: 80,
    width: 200,
    paddingTop: 0,

  },
  spinnerTextStyle: {
    color: 'transparent'
  },
  spinnerContainer: {
    position: 'absolute',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    left: device.width / 2,
    top: device.height / 2.5,
  },

});
