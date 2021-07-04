import React, {Component} from 'react';
import {
  AppRegistry,
  StyleSheet,
  View,
  Button,
  Alert,
  Dimensions,
  Image,
} from 'react-native';

import {SketchCanvas} from '@terrylinla/react-native-sketch-canvas';
import Snackbar from 'react-native-snackbar';
import axios from 'axios';

var device = Dimensions.get('window');

export default class App extends Component {
  // React state: store the image data
  state = {
    imageData: 'data:image/png;base64,',
    generatedImageData: 'data:image/png;base64,',
  };

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

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.drawBox}>
          <SketchCanvas
            ref={ref => (this.canvas = ref)}
            style={{flex: 1}}
            strokeColor={'black'}
            strokeWidth={15}
          />
        </View>
        <Button title="Generate!" onPress={this.grabPixels.bind(this)} />
        <View style={styles.generatedImageBox}>
          {this.state.generatedImageData != null ? (
            <Image
              style={styles.generatedImage}
              source={{uri: this.state.generatedImageData}}
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
});
