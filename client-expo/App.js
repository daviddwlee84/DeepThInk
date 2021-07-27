import React, { Component} from 'react';
import Canvas from 'react-native-canvas';
import {View} from "react-native"
 import DrawCanvas from './components/DrawCanvas';
export default class App extends Component {

  render() {
    return (
      <View>
      <DrawCanvas/>

      </View>
    )
  }
}