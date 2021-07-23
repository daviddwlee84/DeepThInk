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

import Slider from '@react-native-community/slider';
import {SketchCanvas} from '@terrylinla/react-native-sketch-canvas';
import Snackbar from 'react-native-snackbar';
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
let socket = new WebSocket('ws://10.0.2.2:8080/ws');

// Create dynamic style based on device width/height
const styles = StyleSheet.create(generateStyle(device));

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
    // Use react-native-sketch-canvas api
    this.canvas.getBase64('png', false, true, false, false, (_err, result) => {
      const resultImage = `${result}`;
      // Update the state
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
    sendRequest(this.state.imageData).then(generated_image => {
      this.setState(prevState => ({
        ...prevState,
        generatedImageData: generated_image,
        displayedImageData: generated_image,
      }));
    });
  };
  // Send a request to the model server to stylize the generated painting
  sendRequestStyleHelper = async newStyle => {
    // Set new style state
    sendRequestStyle(this.state.generatedImageData, newStyle).then(
      styled_image_data => {
        this.setState(prevState => ({
          ...prevState,
          style: newStyle,
          displayedImageData: styled_image_data,
          stylizedImageData: styled_image_data,
        }));
      },
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
    console.log({x: x, y: y});

    console.log('A stringified is', JSON.stringify(this.canvas.getPaths()));
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
        var newPath = this.getPathData(
          message.point.x,
          message.point.y,
          message.thickness,
          message.color,
        );
        this.canvas.addPath(newPath);
        break;
      case messageKinds.MESSAGE_STROKE_END:
        console.log('RECEIVED END MSG', message);

        var newPath = this.getPathDataArray(
          this.state.collaboratorStroke,
          message.thickness,
          message.color,
        );

        console.log('RECEIVED END STROKE', newPath);
        this.setState(prevState => ({
          ...prevState,
          collaboratorStroke: [],
        }));
        this.canvas.addPath(newPath);

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
        <View style={styles.drawBox}>
          {/* Main canvas */}
          <SketchCanvas
            ref={ref => (this.canvas = ref)}
            style={{flex: 1}}
            canvasStyle={styles.canvasBox}
            strokeWidth={this.state.thickness}
            strokeColor={this.state.color}
            onStrokeChanged={this.onStrokeChangeHandler}
            onStrokeStart={this.onStrokeStartHandler}
            onStrokeEnd={this.onStrokeEndHandler}
          />
          {/* Thickness slider */}
        </View>
        {/* Color palette buttons */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Slider
            style={{width: 200, height: 40}}
            minimumValue={0}
            maximumValue={device.width / 10}
            minimumTrackTintColor="#000000"
            maximumTrackTintColor="#000000"
            onSlidingComplete={this.handleThickness}
          />

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
                    <Text style={{color: 'white'}}>{obj.label}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
          <Text style={{marginRight: 8, fontSize: 20}}>
            {this.state.message}
          </Text>
        </View>
        {/* Style buttons */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
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
                <Text style={{color: 'white'}}>None</Text>
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
                    <Text style={{color: 'white'}}>{obj.label}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
          <Text style={{marginRight: 8, fontSize: 20}}>
            {this.state.message}
          </Text>
        </View>
        {/* Generate button */}
        <Button title="Generate!" onPress={this.grabPixels.bind(this)} />
        {/* Displayed image */}
        <View style={styles.generatedImageBox}>
          {this.state.displayedImageData != null ? (
            <Image
              style={styles.generatedImage}
              source={{uri: this.state.displayedImageData}}
            />
          ) : null}
        </View>
      </View>
    );
  }
}
