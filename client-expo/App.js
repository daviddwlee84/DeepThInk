import React, { Component} from 'react';
import Canvas from 'react-native-canvas';
import {View, Dimensions} from "react-native"
import DrawCanvas from './components/DrawCanvas';
import Slider from '@react-native-community/slider';

var device = Dimensions.get('window');

 export default class App extends Component {
  state = {
    imageData: 'data:image/png;base64,', // raw image data of the segmentation image
    generatedImageData: 'data:image/png;base64,', // raw image data of the generated image
    stylizedImageData: 'data:image/png;base64,', // raw image data of stylized generated image
    displayedImageData: 'data:image/png;base64,', // raw image data of displayed image
    style: 'none', // selected style
    color: '#384f83', // pen color
    thickness: 10, // stroke thickness
  };

  handleThickness = sliderValue => {
    this.setState(prevState => ({
      ...prevState,
      thickness: sliderValue,
    }));
    console.log('thickness is now', sliderValue);
  };

  render() {
    return (
      <View>
      <DrawCanvas thickness={this.state.thickness}/>
      <Slider
            style={{width: 200, height: 40}}
            minimumValue={0}
            maximumValue={device.width / 10}
            minimumTrackTintColor="#000000"
            maximumTrackTintColor="#000000"
            onSlidingComplete={this.handleThickness}
          />

      </View>
    )
  }
}