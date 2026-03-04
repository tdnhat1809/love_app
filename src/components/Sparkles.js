import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const Particle = ({ delay, x, y, color, size }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = () => {
            scale.setValue(0);
            opacity.setValue(0);
            translateY.setValue(0);

            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.sequence([
                        Animated.timing(scale, {
                            toValue: 1,
                            duration: 600,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scale, {
                            toValue: 0.5,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.timing(opacity, {
                            toValue: 0.6,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 2200,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.timing(translateY, {
                        toValue: -60,
                        duration: 2600,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start(() => animate());
        };

        animate();
    }, []);

    return (
        <Animated.View
            style={[
                styles.particle,
                {
                    left: x,
                    top: y,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                    transform: [{ scale }, { translateY }],
                    opacity,
                },
            ]}
        />
    );
};

const Sparkles = ({ count = 15 }) => {
    const colors = ['#FF6B9D', '#C44FE2', '#FFD700', '#FF4B6E', '#FFB6C1', '#6366F1'];

    const particles = Array.from({ length: count }, (_, i) => ({
        id: i,
        delay: Math.random() * 4000,
        x: Math.random() * width,
        y: Math.random() * height * 0.7,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 5,
    }));

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.map((p) => (
                <Particle key={p.id} {...p} />
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
    particle: {
        position: 'absolute',
    },
});

export default Sparkles;
