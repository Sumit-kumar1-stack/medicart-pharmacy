import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = [
  ['Prescription Medicines', 'prescription-medicines'],
  ['Pain Relief', 'pain-relief'],
  ['Vitamins & Supplements', 'vitamins-supplements'],
  ['Diabetes Care', 'diabetes-care'],
  ['First Aid', 'first-aid'],
  ['Healthcare Devices', 'healthcare-devices']
] as const;

const products = [
  { slug:'paracetamol-500', name:'Paracetamol 500 mg', genericName:'Paracetamol', brandName:'MediCart Essential', manufacturer:'Demo Health Labs', composition:'Paracetamol 500 mg', strength:'500 mg', dosageForm:'Tablet', packSize:'15 tablets', description:'Pain and fever relief product. Use only as directed on the label or by a qualified clinician.', pricePaise:3200, mrpPaise:3900, prescriptionRequired:false, category:'pain-relief' },
  { slug:'dolo-650-demo', name:'Dolo 650 Demo', genericName:'Paracetamol', brandName:'Dolo Demo', manufacturer:'Demo Micro Labs', composition:'Paracetamol 650 mg', strength:'650 mg', dosageForm:'Tablet', packSize:'15 tablets', description:'Demonstration catalog entry for a higher-strength paracetamol product.', pricePaise:3400, mrpPaise:4200, prescriptionRequired:true, category:'prescription-medicines' },
  { slug:'azithromycin-500-demo', name:'Azithromycin 500 Demo', genericName:'Azithromycin', brandName:'Azee Demo', manufacturer:'Demo Pharma Ltd', composition:'Azithromycin 500 mg', strength:'500 mg', dosageForm:'Tablet', packSize:'3 tablets', description:'Prescription-only demonstration antibiotic product. Requires pharmacist-approved prescription.', pricePaise:11800, mrpPaise:13900, prescriptionRequired:true, category:'prescription-medicines' },
  { slug:'metformin-500-demo', name:'Metformin 500 Demo', genericName:'Metformin', brandName:'Glyco Demo', manufacturer:'Demo Diabetes Care', composition:'Metformin Hydrochloride 500 mg', strength:'500 mg', dosageForm:'Tablet', packSize:'20 tablets', description:'Prescription-only demonstration diabetes medication entry.', pricePaise:6500, mrpPaise:7800, prescriptionRequired:true, category:'diabetes-care' },
  { slug:'vitamin-d3-1000', name:'Vitamin D3 1000 IU', genericName:'Cholecalciferol', brandName:'SunDaily', manufacturer:'Demo Wellness', composition:'Vitamin D3 1000 IU', strength:'1000 IU', dosageForm:'Tablet', packSize:'30 tablets', description:'Daily vitamin D supplement demonstration product.', pricePaise:18900, mrpPaise:22900, prescriptionRequired:false, category:'vitamins-supplements' },
  { slug:'vitamin-c-zinc', name:'Vitamin C + Zinc', genericName:'Ascorbic Acid + Zinc', brandName:'ImmunoDaily', manufacturer:'Demo Wellness', composition:'Vitamin C 500 mg + Zinc 10 mg', strength:'500 mg + 10 mg', dosageForm:'Tablet', packSize:'20 tablets', description:'General wellness supplement demonstration product.', pricePaise:14900, mrpPaise:17900, prescriptionRequired:false, category:'vitamins-supplements' },
  { slug:'digital-thermometer', name:'Digital Thermometer', genericName:null, brandName:'CareSense', manufacturer:'Demo Devices', composition:null, strength:null, dosageForm:null, packSize:'1 device', description:'Digital thermometer with fast-read display for home use.', pricePaise:24900, mrpPaise:34900, prescriptionRequired:false, category:'healthcare-devices' },
  { slug:'glucometer-kit', name:'Glucometer Starter Kit', genericName:null, brandName:'GlucoCheck', manufacturer:'Demo Devices', composition:null, strength:null, dosageForm:null, packSize:'Meter + 10 strips + lancets', description:'Home blood glucose monitoring starter kit demonstration product.', pricePaise:79900, mrpPaise:99900, prescriptionRequired:false, category:'diabetes-care' },
  { slug:'antiseptic-solution', name:'Antiseptic Solution 100 ml', genericName:null, brandName:'CleanCare', manufacturer:'Demo First Aid', composition:'Antiseptic solution', strength:null, dosageForm:'Topical solution', packSize:'100 ml', description:'Topical antiseptic demonstration product for first-aid use.', pricePaise:8900, mrpPaise:10500, prescriptionRequired:false, category:'first-aid' },
  { slug:'adhesive-bandages', name:'Adhesive Bandages', genericName:null, brandName:'QuickAid', manufacturer:'Demo First Aid', composition:null, strength:null, dosageForm:null, packSize:'20 strips', description:'Assorted adhesive bandages for minor cuts and scrapes.', pricePaise:7900, mrpPaise:9900, prescriptionRequired:false, category:'first-aid' }
] as const;

async function seedUser(email: string, name: string, role: Role, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, active: true },
    create: { email, name, role, passwordHash }
  });
}

async function main() {
  for (const [name, slug] of categories) {
    await prisma.category.upsert({ where: { slug }, update: { name }, create: { name, slug } });
  }

  for (const p of products) {
    const { category: categorySlug, ...data } = p;
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: categorySlug } });
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...data, categoryId: category.id },
      create: { ...data, categoryId: category.id }
    });
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 2);
    await prisma.inventoryBatch.upsert({
      where: { productId_batchNumber: { productId: product.id, batchNumber: `DEMO-${p.slug.slice(0,8).toUpperCase()}` } },
      update: { quantityAvailable: 120, status: 'ACTIVE', expiresAt },
      create: {
        productId: product.id,
        batchNumber: `DEMO-${p.slug.slice(0,8).toUpperCase()}`,
        expiresAt,
        purchasePricePaise: Math.max(100, Math.floor(p.pricePaise * 0.6)),
        quantityReceived: 120,
        quantityAvailable: 120,
        supplierName: 'MediCart Demo Distributor'
      }
    });
  }

  await seedUser('customer@medicart.local', 'Demo Customer', 'CUSTOMER', 'Customer@123');
  await seedUser('pharmacist@medicart.local', 'Demo Pharmacist', 'PHARMACIST', 'Pharmacist@123');
  await seedUser('admin@medicart.local', 'Demo Admin', 'ADMIN', 'Admin@123');

  console.log('Seed complete. Demo users: customer@medicart.local, pharmacist@medicart.local, admin@medicart.local');
}

main().finally(() => prisma.$disconnect());
