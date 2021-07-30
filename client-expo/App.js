import React, {Component} from 'react';
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
  Platform
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
import {sendRequest, sendRequestStyle} from './api/modelApi.js';
import {hello, generateStyle} from './styles/styles.js';
import Point from './classes/Point';
var device = Dimensions.get('window');


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
    // socket: new WebSocket('ws://localhost:8080/ws')
    socket:  Platform.OS === "web" ? new WebSocket('ws://localhost:8080/ws') : new WebSocket('ws://10.0.2.2:8080/ws')

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
      onOpen(this.state.socket, {
        canvasWidth: styles.drawBox.width,
        canvasHeight: styles.drawBox.height,
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
    var getImage = this.refs.drawCanvasRef.getBase64().then((value) => {
      var resultImage = value.split(';base64,')[1];
      console.log("result image is", resultImage)
        this.setState(
          prevState => ({
            ...prevState,
            imageData: resultImage,
          }),
          // Do callback to send to server after the imageData is set
          this.sendRequestHelper,
        );
    })
    
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
        console.log("RECEIVED STROKE STARTT", message)
        // Append collaborator stroke
        this.setState(prevState => ({
          ...prevState,
          collaboratorStroke: [
            ...prevState.collaboratorStroke,
            new Point(message.point.x, message.point.y, message.thickness, message.color, "start"),
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
            new Point(message.point.x, message.point.y, message.thickness, message.color, "move"),
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
        <View style={styles.drawGroup}>
            {/* Main canvas */}
            <DrawCanvas
              ref="drawCanvasRef"
              style="a useless field that cant style"
              thickness={this.state.thickness}
              color={this.state.color}
              socket={this.state.socket}
              otherStrokes={this.state.collaboratorStroke}
            />

            <View style={styles.toolGroup}>
              {/* Thickness slider */}
              <View style={styles.strokeGroup}>
                <Text
                  style={{
                    color: '#07235c',
                    fontWeight: 'bold',
                    fontSize: device.height * 0.025,
                  }}>
                  Stroke size:
                </Text>
                <Slider
                  style={{
                    width: device.width * 0.14,
                    height: device.height * 0.028,
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
                <View
                  style={{
                    justifyContent: 'flex-end', 
                    paddingHorizontal: 5,}}>
                  <TouchableOpacity
                    style={[styles.functionButton]}
                    >
                    <Text
                      style={styles.tempIcons, {color: '#073ead'}}>
                      <svg xmlns="http://www.w3.org/2000/svg" width={device.height * 0.03} height={device.height * 0.03} fill="currentColor" class="bi bi-arrow-counterclockwise" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
                        <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
                      </svg>
                    </Text>
                  </TouchableOpacity> 
                </View>
                <View
                  style={{justifyContent: 'flex-end', paddingHorizontal: 5}}>
                  <TouchableOpacity
                    style={[styles.functionButton]}
                    >
                    <Text
                      style={styles.tempIcons, {color: '#073ead'}}>
                      <svg xmlns="http://www.w3.org/2000/svg" width={device.height * 0.03} height={device.height * 0.03} fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                      </svg>
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={{justifyContent: 'flex-end', paddingHorizontal: 5}}>
                  <TouchableOpacity
                    style={[styles.functionButton]}
                    >
                    <Text
                      style={styles.tempIcons, {color: '#07235c',}}>
                      <svg xmlns="http://www.w3.org/2000/svg" width={device.height * 0.03} height={device.height * 0.03} fill="currentColor" class="bi bi-pencil-fill" viewBox="0 0 16 16">
                        <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
                      </svg>
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={{justifyContent: 'flex-end', paddingHorizontal: 5}}>
                  <TouchableOpacity
                    style={[styles.functionButton]}
                    >
                    <Text
                      style={styles.tempIcons, {color: '#07235c',}}>
                      <svg xmlns="http://www.w3.org/2000/svg" width={device.height * 0.03} height={device.height * 0.03} fill="currentColor" class="bi bi-eraser-fill" viewBox="0 0 16 16">
                        <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm.66 11.34L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z"/>
                      </svg>
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={{justifyContent: 'flex-end', paddingHorizontal: 5}}>
                  <TouchableOpacity
                    style={[styles.functionButton]}
                    >
                    <Text
                      style={styles.tempIcons, {color: '#07235c',}}>
                      <svg xmlns="http://www.w3.org/2000/svg" width={device.height * 0.03} height={device.height * 0.03} fill="currentColor" class="bi bi-trash-fill" viewBox="0 0 16 16">
                        <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/>
                      </svg>
                    </Text>
                  </TouchableOpacity>

                </View>
              </View>
            </View>
          {/* Color palette buttons */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}>
            <View style={{flexDirection: 'row'}}>
              {colorMap.colors.map(obj => {
                return (
                  <View style={{margin: 2}}>
                    <TouchableOpacity
                      style={[
                        styles.functionButton,
                        {backgroundColor: obj.color},
                      ]}
                      onPress={() => {
                        this.setState({color: obj.color});
                      }}>
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
            </View>
            <Text style={{marginRight: 8, fontSize: device.height * 0.025}}>
              {this.state.message}
            </Text>
          </View>
          {/* Style buttons */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}>
            <View style={{flexDirection: 'row'}}>
              {/* None style button */}
              <View style={{margin: 2}}>
                <TouchableOpacity
                  style={[styles.functionButton, {backgroundColor: 'gray'}]}
                  onPress={() => {
                    this.setState(prevState => ({
                      ...prevState,
                      displayedImageData: this.state.generatedImageData,
                    }));
                  }}>
                  <Text style={{color: 'white', fontSize: device.height * 0.024,}}> None </Text>
                </TouchableOpacity>
              </View>
              {/* Programmatically render all style options */}
              {styleTransferOptions.styles.map(obj => {
                return (
                  <View style={{margin: 2}}>
                    <TouchableOpacity
                      style={[styles.functionButton, {backgroundColor: 'gray'}]}
                      onPress={() => {
                        this.sendRequestStyleHelper(obj.name);
                      }}>
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
            </View>
            <Text style={{marginRight: 8, fontSize: device.height * 0.024}}>
              {this.state.message}
            </Text>
          </View>
        </View>

        <View style={styles.genGroup}>
          {/* Displayed image */}
          <View style={styles.generatedImageBox}>
            {this.state.displayedImageData != null ? (
              <Image
                style={styles.generatedImage}
                source={{uri: this.state.displayedImageData}}
              />
            ) : null}
          </View>
          {/* Generate button */}
          <View style={styles.genButton}>
            <TouchableOpacity
              style={[styles.functionButton, {backgroundColor: "#841584"}]}
                onPress={this.grabPixels.bind(this)}
              >
              <Text
                style={{
                  color: 'white',
                  alignItems: 'center',
                  justifyContent: 'venter',
                  fontSize: device.height * 0.035,
                }}>
                {"Generate!"}
              </Text>
            </TouchableOpacity>
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
    justifyContent: 'space-evenly',
    backgroundColor: 'skyblue',
    paddingTop: device.height * 0.02,
  },

  drawBox: {
    flex: 1,
    backgroundColor: 'white',
    borderColor: 'lightblue',
    borderWidth: 10,
    width: device.width * 0.5,
    height: device.height * 0.85,
  },
  generatedImageBox: {
    borderWidth: 10,
    borderColor: 'lightblue',

    width: device.width * 0.45,
    height: device.height * 0.85,
  },
  generatedImage: {
    width: device.width * 0.45,
    height: device.height * 0.85,
  },
  functionButton: {
    padding: 4,
    borderRadius: 5,
  },
  drawGroup: {
    flexDirection: 'column',
  },
  genGroup: {
    flexDirection: 'column',
  },
  genButton: {
    borderRadius: 5,
    paddingTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strokeGroup: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  tempButtons: {
    height: 40,
    width: 70,
    flexDirection: 'row',
  },
  tempIcons: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolGroup: {
    flexDirection: 'row',
  },
});
