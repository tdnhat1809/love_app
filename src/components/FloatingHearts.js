import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const Heart = ({ delay, startX, duration, size }) => {
    const translateY = useRef(new Animated.Value(height + 50)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const rotate = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = () => {
            translateY.setValue(height + 50);
            opacity.setValue(0);
            rotate.setValue(0);

            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: -100,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(opacity, {
                            toValue: 0.8,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0.6,
                            duration: duration - 1600,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.timing(translateX, {
                            toValue: 30,
                            duration: duration / 4,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: -30,
                            duration: duration / 2,
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: 0,
                            duration: duration / 4,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.timing(rotate, {
                        toValue: 1,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start(() => animate());
        };

        animate();
    }, []);

    const rotateInterpolate = rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.Text
            style={[
                styles.heart,
                {
                    left: startX,
                    fontSize: size,
                    transform: [
                        { translateY },
                        { translateX },
                        { rotate: rotateInterpolate },
                    ],
                    opacity,
                },
            ]}
        >
            ❤️
        </Animated.Text>
    );
};

const FloatingHearts = ({ count = 8 }) => {
    const hearts = Array.from({ length: count }, (_, i) => ({
        id: i,
        delay: Math.random() * 5000,
        startX: Math.random() * (width - 40),
        duration: 6000 + Math.random() * 6000,
        size: 14 + Math.random() * 18,
    }));

    return (
        <View style={styles.container} pointerEvents="none">
            {hearts.map((heart) => (
                <Heart key={heart.id} {...heart} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        zIndex: 0,
    },
    heart: {
        position: 'absolute',
    },
});

export default FloatingHearts;
