import React from 'react';
import { ImageBackground } from 'react-native';

function WelcomeScreen(props) {
    return (
        <ImageBackground source={require('../assets/charmander_at_a_campfire_.jpg')}></ImageBackground>
    );
}

export default WelcomeScreen;