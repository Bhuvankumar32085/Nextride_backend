import DataUriParser from "datauri/parser.js";
import path from "path";

// Ye file.buffer(Binary buffer) ko Base64 encoded Data URI string me convert kar rahi hai hum yaha req.file.buffer cloudinary pr upload nahi kr rahe
// yaha direct file aagi jo conver ho jagi base64 me aur uske baad usko cloudinary pr upload karenge
const generateBase64Image = (file: Express.Multer.File) => {
  const parser = new DataUriParser();
  const extName = path.extname(file.originalname).toString();
  const file64 = parser.format(extName, file.buffer);
  return file64.content;
};

export default generateBase64Image;
