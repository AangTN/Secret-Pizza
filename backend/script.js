const fs = require('fs');
const path = require('path');

const filesToAdminify = [
  'categories/category.routes.js',
  'types/type.routes.js',
  'foods/food.routes.js',
  'variants/variant.routes.js',
  'crusts/crust.routes.js',
  'branch/branch.routes.js',
  'vouchers/voucher.routes.js',
  'banners/banner.routes.js',
  'combos/combo.routes.js',
  'promotions/promotion.routes.js',
  'sizes/size.routes.js',
  'options/option.routes.js',
  'gifts/gift.routes.js',
];

filesToAdminify.forEach(file => {
  const fullPath = path.join(__dirname, 'src/api', file);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  if (!content.includes('auth.middleware')) {
    content = "const { requireAdmin } = require('../../middleware/auth.middleware');\n" + content;
  }
  
  // Replace router.post('/', ... to router.post('/', requireAdmin, ...
  content = content.replace(/router\.(post|put|delete|patch)\((['"][^'"]+['"]),(\s*)/g, 'router.$1($2,$3requireAdmin, ');
  
  // also specifically protect /admin routes for GET
  content = content.replace(/router\.get\((['"]\/admin[^'"]*['"]),(\s*)/g, 'router.get($1,$2requireAdmin, ');
  
  fs.writeFileSync(fullPath, content);
});
console.log('Done script!');
