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

var device = Dimensions.get('window');
let socket = new WebSocket('ws://10.0.2.2:8080/ws');

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
  };

  // Run when component is first rendered
  componentDidMount() {
    console.log('Attempting connection');

    // Setup socket handlers
    socket.onopen = () => {
      console.log('Successfully connected');
      socket.send('Hi from client!');
    };

    socket.onclose = event => {
      console.log('Socket closed connection', event);
    };

    socket.onerror = error => {
      console.log('Socket error', error);
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
        this.sendRequest,
      );
    });
  };

  // Send request to model server to generate painting
  sendRequest = () => {
    console.log('Sending API request');
    Snackbar.show({
      text: 'Sending API request to server...',
      duration: Snackbar.LENGTH_SHORT,
    });

    // Send the request to backend
    axios
      .post(
        (url = 'http://10.0.2.2:8000/generate'),
        (data = {
          imageData: this.state.imageData,
        }),
      )
      .then(
        function (response) {
          console.log(response.data.message);

          // Show toast message on bottom of app
          Snackbar.show({
            text: 'Received response!',
            duration: Snackbar.LENGTH_SHORT,
          });

          // Set generated image data
          // Update the generated image state
          var generated_image = response.data.data;
          this.setState(prevState => ({
            ...prevState,
            generatedImageData: generated_image,
            displayedImageData: generated_image,
          }));
        }.bind(this), // JL: Need to bind context to this in order to use setState without error, not sure why
      )
      .catch(function (error) {
        console.log('Error generating image: ' + error.message);
        throw error;
      });
  };

  // Send a request to the model server to stylize the generated painting
  sendRequestStyle = newStyle => {
    // Set new style state
    this.setState(prevState => ({
      ...prevState,
      style: newStyle,
    }));

    // Send stylize image request
    axios
      .post(
        (url = 'http://10.0.2.2:8000/stylize'),
        (data = {
          imageData: this.state.generatedImageData,
          style: newStyle,
        }),
      )
      .then(
        function (response) {
          console.log(response.data.message);

          // Show toast message on bottom of app

          // Set generated image data
          // Update the generated image state
          var styled_image_data = response.data.data;
          this.setState(prevState => ({
            ...prevState,
            displayedImageData: styled_image_data,
            stylizedImageData: styled_image_data,
          }));
          console.log('state is', this.state);
        }.bind(this), // JL: Need to bind context to this in order to use setState without error, not sure why
      )
      .catch(function (error) {
        console.log('Error generating image: ' + error.message);
        throw error;
      });

    // Set the generated image data
  };

  handleThickness = sliderValue => {
    this.setState(prevState => ({
      ...prevState,
      thickness: sliderValue,
    }));
    console.log('thickness is now', sliderValue);
  };

  onStrokeChangeHandler = (x, y) => {
    // console.log(JSON.stringify(this.canvas.getPaths()));
    var point = {
      x: x,
      y: y,
      color: this.state.color,
      thickness: this.state.thickness,
    };

    socket.send(JSON.stringify(point));
    console.log(JSON.stringify(point));
  };

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.drawGroup}>
          <View style={styles.drawBox}>
            {/* Main canvas */}
            <SketchCanvas
              ref={ref => (this.canvas = ref)}
              style={{flex: 1}}
              strokeWidth={this.state.thickness}
              strokeColor={this.state.color}
              onStrokeChanged={this.onStrokeChangeHandler}
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
                  <Text style={{color: 'white', fontSize: 20}}>None</Text>
                </TouchableOpacity>
              </View>
              {/* Programmatically render all style options */}
              {styleTransferOptions.styles.map(obj => {
                return (
                  <View style={{margin: 2}}>
                    <TouchableOpacity
                      style={[styles.functionButton, {backgroundColor: 'gray'}]}
                      onPress={() => {
                        this.sendRequestStyle(obj.name);
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
