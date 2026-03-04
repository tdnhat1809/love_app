// Quiz data — "Bạn hiểu người yêu đến đâu?"
// Each quiz has categories, questions answer by BOTH partners about THEMSELVES,
// then compared to see how well partner knew the answer.

export const QUIZ_CATEGORIES = [
    { key: 'personality', label: 'Tính cách', emoji: '🧠', color: '#7c4dff' },
    { key: 'favorites', label: 'Yêu thích', emoji: '⭐', color: '#FF6B6B' },
    { key: 'romance', label: 'Lãng mạn', emoji: '💕', color: '#e94971' },
    { key: 'dreams', label: 'Ước mơ', emoji: '✨', color: '#45B7D1' },
    { key: 'habits', label: 'Thói quen', emoji: '🔄', color: '#4ECDC4' },
];

// Flow: Each question has 4 options.
// Step 1: Person A answers "about themselves" (e.g. "Món ăn yêu thích của bạn?")
// Step 2: Person B guesses Person A's answer (e.g. "Món ăn yêu thích của người yêu bạn?")
// If B's guess matches A's real answer → +1 point
// Vice versa for Person B's questions.

export const QUIZ_QUESTIONS = [
    // PERSONALITY
    {
        id: 'p1',
        category: 'personality',
        selfQuestion: 'Khi buồn, bạn thường muốn...',
        guessQuestion: 'Khi buồn, người yêu bạn thường muốn...',
        options: ['Ở một mình', 'Được ôm ấp', 'Nói chuyện với ai đó', 'Ăn đồ ngon'],
    },
    {
        id: 'p2',
        category: 'personality',
        selfQuestion: 'Bạn thuộc típ người nào?',
        guessQuestion: 'Người yêu bạn thuộc típ người nào?',
        options: ['Hướng nội', 'Hướng ngoại', 'Linh hoạt', 'Trầm tính'],
    },
    {
        id: 'p3',
        category: 'personality',
        selfQuestion: 'Điều gì khiến bạn tức giận nhất?',
        guessQuestion: 'Điều gì khiến người yêu bạn tức giận nhất?',
        options: ['Bị nói dối', 'Bị phớt lờ', 'Bị phản bội', 'Bị hiểu lầm'],
    },
    {
        id: 'p4',
        category: 'personality',
        selfQuestion: 'Bạn xử lý xung đột bằng cách nào?',
        guessQuestion: 'Người yêu bạn xử lý xung đột bằng cách nào?',
        options: ['Nói thẳng', 'Im lặng trước', 'Nhắn tin giải thích', 'Chờ nguội mới nói'],
    },

    // FAVORITES
    {
        id: 'f1',
        category: 'favorites',
        selfQuestion: 'Loại món ăn bạn thích nhất?',
        guessQuestion: 'Loại món ăn người yêu bạn thích nhất?',
        options: ['Đồ ngọt/Trà sữa', 'Đồ mặn/Cơm', 'Đồ cay/Lẩu', 'Fast food'],
    },
    {
        id: 'f2',
        category: 'favorites',
        selfQuestion: 'Thể loại phim bạn thích nhất?',
        guessQuestion: 'Thể loại phim người yêu bạn thích nhất?',
        options: ['Tình cảm', 'Hành động', 'Kinh dị', 'Hài'],
    },
    {
        id: 'f3',
        category: 'favorites',
        selfQuestion: 'Màu sắc yêu thích của bạn?',
        guessQuestion: 'Màu sắc yêu thích của người yêu bạn?',
        options: ['Hồng/Đỏ', 'Xanh dương', 'Đen/Trắng', 'Tím/Vàng'],
    },
    {
        id: 'f4',
        category: 'favorites',
        selfQuestion: 'Mùa nào bạn thích nhất?',
        guessQuestion: 'Mùa nào người yêu bạn thích nhất?',
        options: ['Xuân', 'Hạ', 'Thu', 'Đông'],
    },

    // ROMANCE
    {
        id: 'r1',
        category: 'romance',
        selfQuestion: 'Ngôn ngữ tình yêu chính của bạn?',
        guessQuestion: 'Ngôn ngữ tình yêu chính của người yêu bạn?',
        options: ['Lời nói yêu thương', 'Cử chỉ quan tâm', 'Quà tặng', 'Ôm ấp/Chạm'],
    },
    {
        id: 'r2',
        category: 'romance',
        selfQuestion: 'Date lý tưởng của bạn?',
        guessQuestion: 'Date lý tưởng của người yêu bạn?',
        options: ['Cafe yên tĩnh', 'Xem phim', 'Ăn uống/Buffet', 'Đi dạo/Công viên'],
    },
    {
        id: 'r3',
        category: 'romance',
        selfQuestion: 'Bạn muốn nhận quà gì nhất?',
        guessQuestion: 'Người yêu bạn muốn nhận quà gì nhất?',
        options: ['Thư tay/Lời nói', 'Đồ handmade', 'Đồ hiệu/Tiền', 'Surprise date'],
    },
    {
        id: 'r4',
        category: 'romance',
        selfQuestion: 'Lời tỏ tình lý tưởng?',
        guessQuestion: 'Lời tỏ tình lý tưởng của người yêu bạn?',
        options: ['Đơn giản, chân thành', 'Lãng mạn, hoành tráng', 'Hài hước, cute', 'Bất ngờ, sáng tạo'],
    },

    // DREAMS
    {
        id: 'd1',
        category: 'dreams',
        selfQuestion: 'Nơi bạn muốn du lịch nhất?',
        guessQuestion: 'Nơi người yêu bạn muốn du lịch nhất?',
        options: ['Nhật Bản/Hàn Quốc', 'Châu Âu', 'Đà Lạt/Biển VN', 'Mỹ/Úc'],
    },
    {
        id: 'd2',
        category: 'dreams',
        selfQuestion: '5 năm nữa bạn muốn...?',
        guessQuestion: '5 năm nữa người yêu bạn muốn...?',
        options: ['Ổn định công việc', 'Kết hôn', 'Du lịch khắp nơi', 'Mua nhà/Xe'],
    },
    {
        id: 'd3',
        category: 'dreams',
        selfQuestion: 'Điều quan trọng nhất trong tình yêu?',
        guessQuestion: 'Điều quan trọng nhất trong tình yêu theo người yêu bạn?',
        options: ['Tin tưởng', 'Trung thành', 'Thấu hiểu', 'Hy sinh'],
    },

    // HABITS
    {
        id: 'h1',
        category: 'habits',
        selfQuestion: 'Bạn là người ngủ dậy sớm hay muộn?',
        guessQuestion: 'Người yêu bạn là người ngủ dậy sớm hay muộn?',
        options: ['Sớm (trước 7h)', 'Bình thường (7-9h)', 'Muộn (sau 9h)', 'Tùy ngày'],
    },
    {
        id: 'h2',
        category: 'habits',
        selfQuestion: 'Khi rảnh bạn thường làm gì?',
        guessQuestion: 'Khi rảnh người yêu bạn thường làm gì?',
        options: ['Lướt điện thoại', 'Xem phim/Anime', 'Ngủ', 'Đi ra ngoài'],
    },
    {
        id: 'h3',
        category: 'habits',
        selfQuestion: 'Thói quen xấu nhất của bạn?',
        guessQuestion: 'Thói quen xấu nhất của người yêu bạn?',
        options: ['Trì hoãn', 'Hay quên', 'Ăn khuya', 'Thức khuya'],
    },
];

export const getQuestionsByCategory = (category) =>
    QUIZ_QUESTIONS.filter(q => q.category === category);

export const getAllQuestions = () => QUIZ_QUESTIONS;
