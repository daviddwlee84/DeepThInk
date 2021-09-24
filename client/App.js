import React, { Component } from 'react';
import {
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

import Slider from '@react-native-community/slider';
// import Snackbar from 'react-native-snackbar';
import axios from 'axios';
import colorMap from './constants/colorMap.js';
import styleTransferOptions from './constants/styleTransferOptions.js';
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
var device = Dimensions.get('window');
const CANVASWIDTH = Math.min(device.width * 0.85, device.height * 0.85);
const CANVASHEIGHT = Math.min(device.width * 0.85, device.height * 0.85);

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
    thickness: 10, // stroke thickness
    ownStroke: [], // client stroke data
    collaboratorStroke: [], // collaborator data
    opacity: 1, // Toggle between the drawing canvas and generated image. 
    // 1 = show drawing canvas, 0 = show image
    // socket: new WebSocket('ws://localhost:8080/ws')
    socket:
      Platform.OS === 'web'
        ? new WebSocket('ws://localhost:8080/ws')
        : new WebSocket('ws://10.0.2.2:8080/ws'),
    canvasWidth: CANVASWIDTH,
    canvasHeight: CANVASHEIGHT,
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
  }

  // Fetch image data from canvas
  // Then call sendRequest to send the data to backend
  grabPixels = async () => {
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
        break;
    }
  };

  render() {
    return (
      <View style={styles.container}>
        {/* Da Brush~ */}
        <View>
          <TouchableOpacity onPress={() => Linking.openURL("https://www.youtube.com/")}>
            <Image style={styles.brushes} source={require('./resources/AIBrush.png')} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL("https://www.youtube.com/")}>
            <Image style={styles.brushes} source={require('./resources/styleBrush.png')} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL("https://www.youtube.com/")}>
            <Image style={styles.brushes} source={require('./resources/userBrush.png')} />
          </TouchableOpacity>
        </View>

        <View style={styles.drawGroup}>

          {/* Displayed image */}
          <View style={styles.generatedImageBox}>
            {this.state.displayedImageData != null ? (
              <Image
                style={styles.generatedImage}
                source={{ uri: this.state.displayedImageData }}
              />
            ) : null}
          </View>
          {/* Main canvas */}
          {/* Conditionally render the main canvas if toggleDraw == true */}

          <View style={styles.shadowBox}>

            <DrawCanvas
              ref="drawCanvasRef"
              style={{ flex: 1, background: 'transparent' }}
              thickness={this.state.thickness}
              color={this.state.color}
              socket={this.state.socket}
              otherStrokes={this.state.collaboratorStroke}
              width={CANVASWIDTH}
              height={CANVASHEIGHT}
              opacity={this.state.opacity}
            />
          </View>


          <View style={styles.toolGroup}>
            {/* Thickness slider */}
            <View style={styles.strokeGroup}>
              <Text
                style={{
                  color: '#07235c',
                  fontWeight: 'bold',
                  fontSize: device.height * 0.023,
                }}>
                Stroke size:
              </Text>
              <Slider
                style={{
                  width: device.width * 0.10,
                  height: device.height * 0.03,
                  marginBottom: 10,
                }}
                minimumValue={1}
                maximumValue={
                  device.width * device.height * (1 / Math.pow(10, 4))
                }
                minimumTrackTintColor="#000000"
                maximumTrackTintColor="#000000"
                onSlidingComplete={this.handleThickness}
              />
            </View>

            <View style={styles.tempButtons}>
              <View style={{ justifyContent: 'flex-end', paddingHorizontal: 5 }}>
                <Button color="#073ead" title="undo!" />
              </View>
              <View style={{ justifyContent: 'flex-end', paddingHorizontal: 5 }}>
                <Button color="#073ead" title="redo!" />
              </View>
              {/* <View style={{justifyContent: 'flex-end', paddingHorizontal: 5}}>
                <Button color="#07235c" title="erase" />
              </View> */}
              <View style={{ justifyContent: 'flex-end', paddingHorizontal: 5 }}>
                <Button color="#07235c" title="clear" />
              </View>
              <View style={{ justifyContent: 'flex-end', paddingHorizontal: 5 }}>

                <Button color="#07235c" title="canvas" onPress={() => {
                  console.log("Toggling draw canvas to ", this.state.opacity)
                  this.setState(prevState => ({
                    ...prevState,
                    opacity: (prevState.opacity * 2 + 1) % 3 / 2,
                  }));

                }} />

              </View>
              {/* Generate button */}
              <View style={{ justifyContent: 'flex-end', paddingHorizontal: 5 }}>
                <Button
                  color="#841584"
                  title="Generate!"
                  onPress={this.grabPixels.bind(this)}
                />
              </View>
            </View>
          </View>
        </View>


        <View style={{ flexDirection: 'row', }}>
          {/* Color palette buttons */}
          <View
            style={{
              flexDirection: 'column',
            }}>

            <ScrollView style={{ height: device.height * 0.7 }}>
              {/* <View style={{ flexDirection: 'column' }}> */}
              {colorMap.colors.map(obj => {
                return (
                  <View style={{ margin: 2 }}>
                    <TouchableOpacity
                      style={[
                        styles.functionButton,
                        { backgroundColor: obj.color,},
                        
                      ]}
                      onPress={() => {
                        this.setState({ color: obj.color });
                      }}>

                      <Image style={styles.brushes} source={obj.logo} />
                      <Text
                        style={{
                          color: 'white',
                          fontSize: device.height * 0.025,
                        }}>
                        {obj.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            {/* </View> */}
            {/* <Text style={{ marginRight: 8, fontSize: device.height * 0.025 }}>
              {this.state.message}
            </Text> */}
          </View>

          {/* Style buttons */}
          <View
            style={{
              flexDirection: 'column',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}>
            {/* <View style={{ flexDirection: 'row' }}> */}
            {/* None style button */}
            <ScrollView style={{ height: device.height * 0.7 }}>
              <View style={{ margin: 2 }}>
                <TouchableOpacity
                  style={[styles.functionButton, { backgroundColor: 'gray' }]}
                  onPress={() => {
                    this.setState(prevState => ({
                      ...prevState,
                      displayedImageData: this.state.generatedImageData,
                    }));
                  }}>
                  <Text style={{ color: 'white', fontSize: 20 }}> None </Text>
                </TouchableOpacity>
              </View>
              {/* Programmatically render all style options */}
              {styleTransferOptions.styles.map(obj => {
                return (
                  <View style={{ margin: 2 }}>
                    <TouchableOpacity
                      style={[styles.functionButton, { backgroundColor: 'gray' }]}
                      onPress={() => {
                        this.sendRequestStyleHelper(obj.name);
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
            {/* </View> */}
            {/* <Text style={{ marginRight: 8, fontSize: device.height * 0.024 }}>
              {this.state.message}
            </Text> */}
          </View>
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
    paddingTop: device.height * 0.02,
  },

  //   drawBox: {
  //     backgroundColor: '#759edf',
  //     borderColor: 'lightblue',
  //     borderWidth: 10,
  //     width: CANVASHEIGHT,
  //     height: CANVASHEIGHT,
  //   },
  generatedImageBox: {
    borderWidth: 8,
    backgroundColor: 'lightblue',
    borderColor: '#fffef5',
    width: CANVASWIDTH,
    height: CANVASHEIGHT,
    position: 'absolute'
  },
  generatedImage: {
    width: CANVASWIDTH,
    height: CANVASHEIGHT,
  },
  shadowBox: {
    shadowColor: 'grey',
    shadowRadius: 20,
    width: CANVASWIDTH,
    height: CANVASHEIGHT,
  },
  functionButton: {
    padding: 4,
    borderRadius: 5,
  },

  drawGroup: {
    flexDirection: 'column',
    display: 'flex'
  },
  //   genGroup: {
  //     flexDirection: 'column',
  //   },
  //   genButton: {
  //     height: 60,
  //     alignItems: 'center',
  //     justifyContent: 'center',
  //   },
  strokeGroup: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  tempButtons: {
    height: 40,
    width: 70,
    flexDirection: 'row',
  },
  toolGroup: {
    flexDirection: 'row',
  },

  brushes: {
    justifyContent: 'start',
    margin: 0,
    height: 100,
    width: 166,
    padding: 0,
  },
});
