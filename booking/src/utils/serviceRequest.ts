import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const headers = {
  communication_secret: process.env.COMMUNICATION_SECRET,
};

export const serviceApi = {
  get: async <T>(url: string): Promise<T> => {
    const { data } = await axios.get(url, { headers });

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  },

  post: async <T>(
    url: string,
    body?: any,
  ): Promise<T> => {
    const { data } = await axios.post(
      url,
      body,
      { headers },
    );

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  },
};