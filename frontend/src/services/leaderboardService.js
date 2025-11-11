import api from './api';

export const leaderboardService = {
  /**
   * Lấy bảng xếp hạng từ API
   * @param {string} filter - (Hiện chưa dùng) Bộ lọc
   * @param {number} limit - (Hiện chưa dùng) Giới hạn
   * @returns {Promise<Array<Object>>} - Một mảng các đối tượng player
   */
  getLeaderboard: async (filter = 'all', limit = 50) => {
    const url = "https://pnqee3jt84.execute-api.ap-southeast-1.amazonaws.com/dev/";

    let response;
    try {
      response = await fetch(url, {
        method: "GET"
      });

    } catch (networkError) {
      console.error('Lỗi mạng khi gọi API:', networkError);
      throw new Error(`Lỗi mạng: ${networkError.message}`);
    }

    const rawResponseText = await response.text();

    if (!response.ok) {
      console.error('API trả về lỗi:', rawResponseText);
      throw new Error(`Failed to fetch leaderboard: ${response.status} - ${rawResponseText}`);
    }

    try {
      // Chỉ khi response.ok, chúng ta mới thử parse JSON
      const data = JSON.parse(rawResponseText);
      return data; // Trả về mảng dữ liệu player
    } catch (parseError) {
      // Xử lý trường hợp Lambda trả về '200 OK' nhưng nội dung không phải JSON
      console.error('Phản hồi không phải là JSON hợp lệ:', rawResponseText);
      throw new Error(`Failed to parse response from server: ${parseError.message}`);
    }
  },


  getUserRank: async (userId) => {
    const response = await api.get(`/api/leaderboard/user/${userId}/`);
    return response.data;
  },
};