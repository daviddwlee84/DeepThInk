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

// Sends a request to backend when clicking the "generate" button

export default class App extends Component {
  sendRequest = () => {
    console.log('Sending API request');
    Snackbar.show({
      text: 'Sending API request to server...',
      duration: Snackbar.LENGTH_SHORT,
    });

    this.grabPixels();

    // Send the request to backend
    axios.get('http://10.0.2.2:8080/ping').then(function (response) {
      console.log(response.data.message);

      // Show toast message on bottom of app
      Snackbar.show({
        text: 'Received response!',
        duration: Snackbar.LENGTH_SHORT,
      });
    });
  };

  // Get image data from canvas
  grabPixels = () => {
    this.canvas.getBase64('jpg', false, true, false, false, (_err, result) => {
      const resultImage = `data:image/jpg;base64,${result}`;
      return resultImage;
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
