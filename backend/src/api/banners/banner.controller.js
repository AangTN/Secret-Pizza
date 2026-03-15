const bannerService = require('./banner.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../../public/images/Banner');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const name = 'banner-' + Date.now() + ext;
    cb(null, name);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const getBanners = async (req, res) => {
  try {
    const banners = await bannerService.getBanners();
    res.status(200).json({ data: banners });
  } catch (error) {
    console.error('Error in getBanners controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const createBanner = [
  upload.single('file'),
  async (req, res) => {
    try {
      console.log('createBanner - body:', req.body);
      console.log('createBanner - file:', req.file);
      const { DuongDan } = req.body;
      let AnhBanner;
      if (req.file) {
        AnhBanner = `/images/Banner/${req.file.filename}`;
      }
      if (!AnhBanner) {
        return res.status(400).json({ message: 'Thiếu file ảnh' });
      }
      const banner = bannerService.addBanner({ AnhBanner, DuongDan: DuongDan || '/' });
      res.status(201).json({ data: banner });
    } catch (error) {
      console.error('Error in createBanner controller:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ message: 'Lỗi server nội bộ: ' + error.message });
    }
  }
];

const editBanner = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { DuongDan } = req.body;
      const payload = {};
      if (req.file) {
        payload.AnhBanner = `/images/Banner/${req.file.filename}`;
      }
      if (DuongDan) payload.DuongDan = DuongDan;
      const updated = bannerService.updateBanner(id, payload);
      if (!updated) return res.status(404).json({ message: 'Banner không tồn tại' });
      res.status(200).json({ data: updated });
    } catch (error) {
      console.error('Error in editBanner controller:', error);
      res.status(500).json({ message: 'Lỗi server nội bộ' });
    }
  }
];

const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const ok = bannerService.deleteBanner(id);
    if (!ok) return res.status(404).json({ message: 'Banner không tồn tại' });
    res.status(200).json({ message: 'Đã xóa banner' });
  } catch (error) {
    console.error('Error in deleteBanner controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

module.exports = { getBanners, createBanner, editBanner, deleteBanner };
