import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

function getLoveDays() {
    const start = new Date(2022, 4, 25);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

export function LoveWidget() {
    const days = getLoveDays();

    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#1a0a2e',
                borderRadius: 24,
                padding: 16,
            }}
        >
            <TextWidget
                text="Nhật ❤️ Nhi"
                style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#FF6B9D',
                    marginBottom: 4,
                }}
            />
            <TextWidget
                text={`${days}`}
                style={{
                    fontSize: 48,
                    fontWeight: '900',
                    color: '#FFFFFF',
                }}
            />
            <TextWidget
                text="ngày yêu nhau 💕"
                style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: 2,
                }}
            />
            <TextWidget
                text="Từ 25/05/2022"
                style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 6,
                }}
            />
        </FlexWidget>
    );
}

const widgetName = 'LoveCounter';

export const widgetTaskHandler = async (props) => {
    const widgetInfo = props.widgetInfo;

    switch (props.widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED':
            props.renderWidget(<LoveWidget />);
            break;
        case 'WIDGET_DELETED':
            break;
        case 'WIDGET_CLICK':
            break;
        default:
            break;
    }
};
