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
        <View style={styles.drawBox}>
          {/* Main canvas */}
          <SketchCanvas
            ref={ref => (this.canvas = ref)}
            style={{flex: 1}}
            strokeWidth={this.state.thickness}
            strokeColor={this.state.color}
            onStrokeChanged={this.onStrokeChangeHandler}
          />
          {/* Thickness slider */}
          <Slider
            style={{width: 200, height: 40}}
            minimumValue={1}
            maximumValue={40}
            minimumTrackTintColor="#000000"
            maximumTrackTintColor="#000000"
            onSlidingComplete={this.handleThickness}
          />
        </View>
        {/* Color palette buttons */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
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
                      this.sendRequestStyle(obj.name);
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'skyblue',
  },

  drawBox: {
    aspectRatio: 1,
    backgroundColor: 'white',
    borderColor: 'lightblue',
    borderWidth: 10,
    width: device.width * 0.75,
    height: device.width * 0.75,
  },
  generatedImageBox: {
    aspectRatio: 1,
    borderWidth: 10,
    borderColor: 'lightblue',

    width: device.width * 0.6,
    height: device.width * 0.6,
  },
  generatedImage: {
    width: device.width * 0.6,
    height: device.width * 0.6,
  },
  functionButton: {
    padding: 4,
    borderRadius: 5,
  },
});
