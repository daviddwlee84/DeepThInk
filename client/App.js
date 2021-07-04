import React, {Component} from 'react';
import {
  AppRegistry,
  StyleSheet,
  View,
  Button,
  Alert,
  Dimensions,
} from 'react-native';

import {SketchCanvas} from '@terrylinla/react-native-sketch-canvas';
import Snackbar from 'react-native-snackbar';
import axios from 'axios';

var device = Dimensions.get('window');

export default class App extends Component {
  // React state: store the image data
  state = {
    imageData: 'data:image/jpg;base64,',
  };

  sendRequest = () => {
    console.log('Sending API request');
    Snackbar.show({
      text: 'Sending API request to server...',
      duration: Snackbar.LENGTH_SHORT,
    });

    // Fetch image data
    const imageData = this.grabPixels();

    // Send the request to backend
    axios.get('http://10.0.2.2:8080/ping').then(function (response) {
      console.log(response.data.message);

      // Show toast message on bottom of app
      Snackbar.show({
        text: 'Received response!',
        duration: Snackbar.LENGTH_SHORT,
      });
    });

    // Send the request to backend
    axios
      .post(
        (url = 'http://10.0.2.2:8000/generate'),
        (data = {
          imageData: this.state.imageData,
        }),
      )
      .then(function (response) {
        console.log(response.data.message);

        // Show toast message on bottom of app
        Snackbar.show({
          text: 'Received response!!',
          duration: Snackbar.LENGTH_SHORT,
        });
      });
  };

  // Fetch image data from canvas
  grabPixels = () => {
    // Use react-native-sketch-canvas api
    this.canvas.getBase64('png', false, true, false, false, (_err, result) => {
      const resultImage = `${result}`;

      // Update the state
      this.setState({imageData: resultImage});
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
        <Button title="Generate!" onPress={() => this.sendRequest()} />
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
});
