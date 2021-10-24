// import Snackbar from 'react-native-snackbar';
import axios from 'axios';

export async function sendRequest(imageData) {
  console.log('Sending API request');
  // Snackbar.show({
  //   text: 'Sending API request to server...',
  //   duration: Snackbar.LENGTH_SHORT,
  // });

  // Send the request to backend
  const res = await axios
    .post(
      (url = 'http://34.135.207.147:8000/generate'),
      (data = {
        imageData: imageData,
      }),
    )
    // Get reponse
    .then(
      function (response) {
        // console.log(response.data.message);
        // console.log(response.data.data);

        // Show toast message on bottom of app
        // Snackbar.show({
        //   text: 'Received response!',
        //   duration: Snackbar.LENGTH_SHORT,
        // });

        // Set generated image data
        // Update the generated image state
        return response.data.data;
      }, // JL: Need to bind context to this in order to use setState without error, not sure why
    )
    .catch(function (error) {
      console.log('Error generating image: ' + error.message);
      throw error;
    });
  return res;
}

export async function sendRequestStyle(imageData, style) {
  // Send stylize image request
  var res = await axios
    .post(
      (url = 'http://34.135.207.147:8000/stylize'),
      (data = {
        imageData: imageData,
        style: style,
      }),
    )
    .then(function (response) {
      console.log(response.data.message);

      // Set generated image data
      // Update the generated image state
      return response.data.data;
    })
    .catch(function (error) {
      console.log('Error generating image: ' + error.message);
      throw error;
    });
  return res;
}
