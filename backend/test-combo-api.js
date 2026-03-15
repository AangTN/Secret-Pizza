/**
 * Test script for Combo API endpoint
 * Run: node test-combo-api.js
 */

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testCreateCombo() {
  console.log('\n🧪 Testing POST /api/combos...\n');

  try {
    // Prepare test data
    const comboData = {
      tenCombo: 'Combo Test Pizza Hấp Dẫn',
      moTa: 'Combo pizza siêu tiết kiệm cho gia đình',
      giaCombo: 299000,
      trangThai: 'Active',
      items: [
        {
          maBienThe: 1, // Pizza size M
          maDeBanh: 1, // Đế dày
          soLuong: 1
        },
        {
          maBienThe: 5, // Pizza khác size S
          maDeBanh: null,
          soLuong: 2
        }
      ]
    };

    // Create FormData
    const form = new FormData();
    form.append('data', JSON.stringify(comboData));

    // Try to find a test image, or create a dummy one
    const testImagePath = path.join(__dirname, 'public', 'images', 'AnhMonAn', 'test.jpg');
    
    // If test image exists, use it; otherwise skip file upload for now
    if (fs.existsSync(testImagePath)) {
      form.append('hinhAnhFile', fs.createReadStream(testImagePath));
      console.log('✅ Using test image:', testImagePath);
    } else {
      console.log('⚠️  Test image not found. API will reject without image.');
      console.log('   Expected path:', testImagePath);
      console.log('   Please add a test image or test manually from frontend.\n');
      return;
    }

    // Send request
    console.log('📤 Sending request to:', `${API_BASE}/combos`);
    console.log('📦 Payload:', JSON.stringify(comboData, null, 2));
    
    const response = await axios.post(`${API_BASE}/combos`, form, {
      headers: form.getHeaders(),
    });

    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n🎉 Combo created successfully!\n');

  } catch (error) {
    console.error('\n❌ ERROR!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    console.log('\n');
  }
}

// Run test
testCreateCombo();
