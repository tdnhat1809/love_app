// Daily questions for couple
// One question per day, rotating through the list

export const DAILY_QUESTIONS = [
    'Điều gì khiến em hạnh phúc nhất hôm nay?',
    'Nếu được quay lại 1 ngày, em chọn ngày nào?',
    'Em yêu điều gì nhất ở anh/em?',
    'Kỷ niệm đẹp nhất của chúng mình?',
    'Nếu đi du lịch ngay bây giờ, em muốn đi đâu?',
    'Bài hát nào khiến em nghĩ đến anh/em?',
    'Em thích được ôm hay được hôn hơn?',
    'Điều em muốn nói mà chưa dám nói?',
    'Em mơ thấy gì đêm qua?',
    'Điều nhỏ nhất anh/em từng làm khiến em vui?',
    'Em muốn chúng mình cùng làm gì cuối tuần?',
    'Nếu có phép thần, em ước điều gì cho chúng mình?',
    'Em thích nhận quà bất ngờ hay kế hoạch sẵn?',
    'Khoảnh khắc nào em thấy yêu nhất?',
    'Em nghĩ chúng mình sẽ ra sao 10 năm nữa?',
    'Điều gì em muốn thay đổi trong mối quan hệ?',
    'Em có nhớ lần đầu mình gặp nhau không?',
    'Món ăn em muốn nấu cho anh/em?',
    'Em thích buổi sáng hay buổi tối hơn?',
    'Điều em biết ơn nhất hôm nay?',
    'Em muốn anh/em bất ngờ em bằng cách nào?',
    'Nếu viết thư cho em của 5 năm trước, em sẽ nói gì?',
    'Phim/Anime yêu thích mà em muốn xem lại cùng nhau?',
    'Em thích khi anh/em làm gì cho em nhất?',
    'Một từ miêu tả tình yêu của chúng mình?',
    'Em có tin vào duyên số không?',
    'Điều em sợ nhất trong tình yêu?',
    'Em muốn nuôi thú cưng gì?',
    'Nơi em muốn sống cùng nhau?',
    'Lời hứa em muốn giữ mãi với anh/em?',
];

// Get today's question (cycles through list)
export function getTodayQuestion() {
    const start = new Date(2024, 0, 1); // Jan 1, 2024
    const today = new Date();
    const dayDiff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    const idx = dayDiff % DAILY_QUESTIONS.length;
    return { question: DAILY_QUESTIONS[idx], dayIndex: idx, date: today.toISOString().split('T')[0] };
}
