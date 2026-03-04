// Re-export from the new massive quotes database for backward compatibility
import { getDailyQuote as _getDailyQuote, getRandomQuote as _getRandomQuote, BASE_QUOTES } from './quotesDB';

// Keep legacy exports working
export const loveQuotes = BASE_QUOTES.romantic.map(text => ({ text, lang: 'vi' }));

export const loveMessages = [
    'Anh yêu em nhiều lắm! 💕',
    'Nhớ em quá trời! 💭',
    'Em ơi, anh muốn ôm em! 🤗',
    'Hôm nay em vui không? 😊',
    'Em là tất cả của anh! ❤️',
    'Ước gì được ở bên em lúc này! 🌟',
    'Em ăn cơm chưa? Nhớ ăn uống đầy đủ nhé! 🍚',
    'Chúc em ngày mới vui vẻ! 🌈',
    'Tối nay mình gọi video nhé! 📱',
    'Em mãi là người đặc biệt nhất! 👑',
    'Anh tự hào vì có em! 🎯',
    'Gửi em ngàn nụ hôn! 💋',
    'Em xinh quá đi! 🌸',
    'Anh luôn ở đây vì em! 💪',
    'Cùng nhau mãi mãi nhé! ♾️',
    'Good morning em yêu! ☀️',
    'Good night em, mơ đẹp nhé! 🌙',
    'Em là ngọt ngào nhất! 🍯',
    'Anh sẽ làm em hạnh phúc mỗi ngày! 🎉',
    'Yêu em muôn đời! 💖',
];

export function getRandomQuote() {
    return _getRandomQuote();
}

export function getRandomMessage() {
    return loveMessages[Math.floor(Math.random() * loveMessages.length)];
}

export function getDailyQuote() {
    return _getDailyQuote();
}
