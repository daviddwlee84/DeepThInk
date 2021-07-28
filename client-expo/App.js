// import React, { Component} from 'react';
// import {View, Dimensions, StyleSheet} from "react-native"

// import Canvas from 'react-native-canvas';
// import DrawCanvas from './components/DrawCanvas';
// import Slider from '@react-native-community/slider';
// import { generateStyle } from './styles/styles';

// var device = Dimensions.get('window');

// const styles = StyleSheet.create(generateStyle(device));

//  export default class App extends Component {
//   state = {
//     imageData: 'data:image/png;base64,', // raw image data of the segmentation image
//     generatedImageData: 'data:image/png;base64,', // raw image data of the generated image
//     stylizedImageData: 'data:image/png;base64,', // raw image data of stylized generated image
//     displayedImageData: 'data:image/png;base64,', // raw image data of displayed image
//     style: 'none', // selected style
//     color: '#384f83', // pen color
//     thickness: 10, // stroke thickness
//   };

//   handleThickness = sliderValue => {
//     this.setState(prevState => ({
//       ...prevState,
//       thickness: sliderValue,
//     }));
//     console.log('thickness is now', sliderValue);
//   };

//   render() {
//     return (
//       <View style={styles.container}>
//       <DrawCanvas thickness={this.state.thickness} color={this.state.color}/>
//       <Slider
//             style={{width: 200, height: 40}}
//             minimumValue={0}
//             maximumValue={device.width / 10}
//             minimumTrackTintColor="#000000"
//             maximumTrackTintColor="#000000"
//             onSlidingComplete={this.handleThickness}
//           />

//       </View>
//     )
//   }
// }

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
var device = Dimensions.get('window');

// Connect to Go backend
let socket = new WebSocket('ws://localhost:8080/ws');

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
  };

  constructor(props) {
    super(props);
    this.sendRequestHelper = this.sendRequestHelper.bind(this);
  }

  // Run when component is first rendered
  componentDidMount() {
    console.log('Attempting connection');

    // Setup socket handlers
    socket.onopen = () => {
      onOpen(socket, {
        canvasWidth: styles.drawBox.width,
        canvasHeight: styles.drawBox.height,
      });
    };
    socket.onclose = event => {
      onClose(event);
    };
    socket.onerror = error => {
      onError(error);
    };

    socket.onmessage = event => {
      this.onMesageHandler(event);
    };
  }

  // Fetch image data from canvas
  // Then call sendRequest to send the data to backend
  grabPixels = () => {
    var resultImage = this.refs.drawCanvasRef.getBase64()
    resultImage = resultImage.split(';base64,')[1];
    console.log("result image is", resultImage)
      this.setState(
        prevState => ({
          ...prevState,
          imageData: resultImage,
        }),
        // Do callback to send to server after the imageData is set
        this.sendRequestHelper,
      );
    
  };

  // Send request to model server to generate painting
  sendRequestHelper = async () => {
    socket.send(
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
    socket.send(
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

  // Send stroke point data
  onStrokeChangeHandler = (x, y) => {
    sendStroke(socket, {x: x, y: y}, this.state.color, this.state.thickness);
  };

  // Send stroke end signal
  onStrokeEndHandler = () => {
    sendStrokeEnd(socket, this.state.color, this.state.thickness);
  };
  onStrokeStartHandler = (x, y) => {
    sendStrokeStart(socket);
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
    // console.log(this.canvas.getPaths());
    // console.log(this.canvas._size.width, this.canvas._size.height);
    switch (message.kind) {
      case messageKinds.MESSAGE_STROKE:
        // Append collaborator stroke
        this.setState(prevState => ({
          ...prevState,
          collaboratorStroke: [
            ...prevState.collaboratorStroke,
            {x: message.point.x, y: message.point.y},
          ],
        }));
        // var newPath = this.getPathDataArray(
        //   this.state.collaboratorStroke,
        //   message.thickness,
        //   message.color,
        // );
        // var newPath = this.getPathData(
        //   message.point.x,
        //   message.point.y,
        //   message.thickness,
        //   message.color,
        // );
        // this.canvas.addPath(newPath); // uncomment for live drawing
        break;
      case messageKinds.MESSAGE_STROKE_END:
        var newPath = this.getPathDataArray(
          this.state.collaboratorStroke,
          message.thickness,
          message.color,
        );

        this.setState(prevState => ({
          ...prevState,
          collaboratorStroke: [],
        }));
        this.canvas.addPath(newPath);

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
        console.log('iamge staylzize', message);
        this.setState(prevState => ({
          ...prevState,
          style: message.style,
          stylizedImageData: message.imageData,
          displayedImageData: message.imageData,
        }));
        break;
    }
  };

  getPathData = (x, y, width, color) => {
    return {
      drawer: null,
      size: {
        width: this.canvas._size.width,
        height: this.canvas._size.height,
      },
      path: {
        data: [`${x.toString()},${y.toString()}`],
        // eslint-disable-next-line radix
        width: width,
        color: color,
        id: parseInt(Math.random() * 100000000),
      },
    };
  };

  getPathDataArray = (data, width, color) => {
    parsedArr = [];
    for (var i = 0; i < data.length; i++) {
      parsedArr.push(`${data[i].x},${data[i].y}`);
    }
    return {
      drawer: null,
      size: {
        width: this.canvas._size.width,
        height: this.canvas._size.height,
      },
      path: {
        data: parsedArr,
        // eslint-disable-next-line radix
        width: width,
        color: color,
        id: parseInt(Math.random() * 100000000),
      },
    };
  };

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.drawGroup}>
            {/* Main canvas */}
            <DrawCanvas
              ref="drawCanvasRef"
              style={{flex: 1}}
              thickness={this.state.thickness}
              color={this.state.color}
            />

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
                    width: device.width * 0.15,
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
                <View
                  style={{justifyContent: 'flex-end', paddingHorizontal: 5}}>
                  <Button color="#073ead" title="undo!" />
                </View>
                <View
                  style={{justifyContent: 'flex-end', paddingHorizontal: 5}}>
                  <Button color="#073ead" title="redo!" />
                </View>
                <View
                  style={{justifyContent: 'flex-end', paddingHorizontal: 5}}>
                  <Button color="#07235c" title="erase" />
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
                  <Text style={{color: 'white', fontSize: 20}}> None </Text>
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
            <Button
              color="#841584"
              title="Generate!"
              onPress={this.grabPixels.bind(this)}
            />
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
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
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
  toolGroup: {
    flexDirection: 'row',
  },
});
