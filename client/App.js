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
  Text
} from 'react-native';

import Slider from '@react-native-community/slider';
import { SketchCanvas } from '@terrylinla/react-native-sketch-canvas';
import Snackbar from 'react-native-snackbar';
import axios from 'axios';

var device = Dimensions.get('window');

export default class App extends Component {
  // React state: store the image data
  state = {
    imageData: 'data:image/png;base64,',
    generatedImageData: 'data:image/png;base64,',
    color: "#000000",
    thickness: 10,

  };

  colorMap = [
    { color: "#384f83", id: 154, label: "sea" },
    { color: "#3c3b4b", id: 134, label: "mountain" },
    { color: "#759edf", id: 156, label: "sky" },
  ];


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
            text: 'Received response!!',
            duration: Snackbar.LENGTH_SHORT,
          });

          // Set generated image data
          // Update the generated image state
          var generated_image = response.data.data;
          this.setState(prevState => ({
            ...prevState,
            generatedImageData: generated_image,
          }));
          console.log('state is', this.state);
        }.bind(this), // JL: Need to bind context to this in order to use setState without error, not sure why
      )
      .catch(function (error) {
        console.log('Error generating image: ' + error.message);
        throw error;
      });
  };

  handleThickness = (sliderValue) => {
    this.setState(prevState => ({
      ...prevState,
      thickness: sliderValue,
    }));
    console.log("thickness is now", sliderValue)
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.drawBox}>
          <SketchCanvas
            ref={ref => (this.canvas = ref)}
            style={{ flex: 1 }}
            strokeWidth={this.state.thickness}
            strokeColor={this.state.color}
          />

          <Slider
            style={{ width: 200, height: 40 }}
            minimumValue={1}
            maximumValue={40}
            minimumTrackTintColor="#000000"
            maximumTrackTintColor="#000000"
            onSlidingComplete={this.handleThickness}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row' }}>
              {this.colorMap.map(obj => {
                return <View style={{margin: 2}}>
                  <TouchableOpacity style={[styles.functionButton, { backgroundColor: obj.color }]} onPress={() => {
                    this.setState({ color: obj.color })
                  }}>
                    <Text style={{ color: 'white' }}>{obj.label}</Text>
                  </TouchableOpacity>
                </View>
              })}
            </View>
            <Text style={{ marginRight: 8, fontSize: 20 }}>{this.state.message}</Text>
          </View>


        <Button title="Generate!" onPress={this.grabPixels.bind(this)} />
        <View style={styles.generatedImageBox}>
          {this.state.generatedImageData != null ? (
            <Image
              style={styles.generatedImage}
              source={{ uri: this.state.generatedImageData }}
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

    width: device.width * 0.75,
    height: device.width * 0.75,
  },
  generatedImage: {
    width: device.width * 0.75,
    height: device.width * 0.75,
  },
  functionButton: {
    padding: 4
  }
});
