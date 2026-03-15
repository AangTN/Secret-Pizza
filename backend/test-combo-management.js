/**
 * Test Combo Management APIs
 * Run: node test-combo-management.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testUpdateComboStatus() {
  console.log('\n🧪 Testing PATCH /api/combos/:id/status...\n');

  try {
    const comboId = 1; // Change to existing combo ID
    const newStatus = 'Inactive'; // or 'Active'

    console.log('📤 Updating combo status...');
    console.log('Combo ID:', comboId);
    console.log('New Status:', newStatus);

    const response = await axios.patch(`${API_BASE}/combos/${comboId}/status`, {
      status: newStatus
    });

    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n🎉 Status updated successfully!\n');

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

async function testDeleteCombo() {
  console.log('\n🧪 Testing DELETE /api/combos/:id...\n');

  try {
    const comboId = 2; // Change to existing combo ID

    console.log('📤 Deleting combo...');
    console.log('Combo ID:', comboId);

    const response = await axios.delete(`${API_BASE}/combos/${comboId}`);

    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n🎉 Combo deleted successfully!\n');

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

async function testGetCombosAdmin() {
  console.log('\n🧪 Testing GET /api/combos/admin...\n');

  try {
    console.log('📤 Fetching combos...');

    const response = await axios.get(`${API_BASE}/combos/admin`);

    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Total combos:', response.data.data?.length || 0);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n🎉 Combos fetched successfully!\n');

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

// Run tests
async function runTests() {
  console.log('🚀 Starting Combo Management API Tests...\n');
  console.log('='.repeat(50));
  
  // Test 1: Get all combos
  await testGetCombosAdmin();
  
  // Test 2: Update status (uncomment to run)
  // await testUpdateComboStatus();
  
  // Test 3: Delete combo (uncomment to run)
  // await testDeleteCombo();
  
  console.log('='.repeat(50));
  console.log('\n✅ All tests completed!\n');
}

runTests();
