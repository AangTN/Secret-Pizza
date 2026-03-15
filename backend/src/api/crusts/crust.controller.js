const crustService = require('./crust.service');

const getCrusts = async (req, res) => {
  try {
    const crusts = await crustService.getAllCrusts();
    res.status(200).json(crusts);
  } catch (error) {
    console.error('Error in getCrusts controller:', error);
    res.status(500).json({ message: 'Lỗi server nội bộ' });
  }
};

const createCrust = async (req, res) => {
  try {
    const crust = await crustService.createCrust(req.body);
    res.status(201).json(crust);
  } catch (error) {
    console.error('Error in createCrust controller:', error);
    // Handle unique constraint violation (P2002)
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Tên đế bánh đã tồn tại' });
    }
    res.status(error.status || 500).json({ message: error.message || 'Lỗi server nội bộ' });
  }
};

module.exports = { getCrusts, createCrust };
