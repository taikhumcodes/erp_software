import { ensureDbProxy } from './db-proxy.js';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedDemoData() {
  const proxiedUrl = await ensureDbProxy();
  const urlObj = new URL(proxiedUrl);
  urlObj.searchParams.set('schema', 'demo');
  const demoUrl = urlObj.toString();

  const prisma = new PrismaClient({
    datasources: { db: { url: demoUrl } },
  });

  // 1. Roles
  const roles: { name: UserRole; description: string }[] = [
    { name: 'OWNER', description: 'Full system access, cannot be restricted' },
    { name: 'ADMIN', description: 'Manage users, settings, all modules' },
    { name: 'MANAGER', description: 'Approve transactions, view all reports' },
    { name: 'SALES', description: 'Create and manage sales orders' },
    { name: 'WAREHOUSE', description: 'Manage inventory and delivery orders' },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    const existing = await prisma.role.findFirst({ where: { name: r.name } });
    if (existing) {
      roleMap[r.name] = existing.id;
    } else {
      const created = await prisma.role.create({ data: r });
      roleMap[r.name] = created.id;
    }
  }

  // 2. Demo User in demo schema
  const demoPasswordHash = await bcrypt.hash('Demo@1234', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@gmail.com' },
    update: {
      passwordHash: demoPasswordHash,
      isActive: true,
      isDemo: true,
      name: 'Demo Client User',
      nameAr: 'مستخدم تجريبي',
      roleId: roleMap['ADMIN'] || Object.values(roleMap)[0],
    },
    create: {
      email: 'demo@gmail.com',
      passwordHash: demoPasswordHash,
      name: 'Demo Client User',
      nameAr: 'مستخدم تجريبي',
      roleId: roleMap['ADMIN'] || Object.values(roleMap)[0],
      isActive: true,
      isDemo: true,
    },
  });

  // Also ensure demo user exists in public schema so login can authenticate and route them
  const publicPrisma = new PrismaClient();
  await publicPrisma.user.upsert({
    where: { email: 'demo@gmail.com' },
    update: {
      passwordHash: demoPasswordHash,
      isActive: true,
      isDemo: true,
      name: 'Demo Client User',
      nameAr: 'مستخدم تجريبي',
    },
    create: {
      email: 'demo@gmail.com',
      passwordHash: demoPasswordHash,
      name: 'Demo Client User',
      nameAr: 'مستخدم تجريبي',
      roleId: (await publicPrisma.role.findFirst())?.id || roleMap['ADMIN'],
      isActive: true,
      isDemo: true,
    },
  });
  await publicPrisma.$disconnect();

  // 3. Units
  const unitsData = [
    { abbreviation: 'PCS', name: 'Pieces', nameAr: 'قطع' },
    { abbreviation: 'BOX', name: 'Box', nameAr: 'صندوق' },
    { abbreviation: 'SET', name: 'Set', nameAr: 'طقم' },
    { abbreviation: 'PKT', name: 'Packet', nameAr: 'حزمة' },
    { abbreviation: 'ROLL', name: 'Roll', nameAr: 'لفة' },
    { abbreviation: 'MTR', name: 'Meter', nameAr: 'متر' },
    { abbreviation: 'KG', name: 'Kilogram', nameAr: 'كيلوغرام' },
  ];
  const unitMap: Record<string, string> = {};
  for (const u of unitsData) {
    const existing = await prisma.unit.findFirst({ where: { name: u.name } });
    if (existing) {
      unitMap[u.name] = existing.id;
      unitMap[u.abbreviation] = existing.id;
    } else {
      const created = await prisma.unit.create({ data: { ...u, isActive: true } });
      unitMap[u.name] = created.id;
      unitMap[u.abbreviation] = created.id;
    }
  }

  // 4. Categories
  const categoriesData = [
    { name: 'Power Tools', nameAr: 'أدوات كهربائية', description: 'Heavy duty drills, grinders and saws' },
    { name: 'Hand Tools', nameAr: 'أدوات يدوية', description: 'Hammers, wrenches, pliers and measuring tapes' },
    { name: 'Fasteners & Screws', nameAr: 'براغي ومثبتات', description: 'High tensile anchors, bolts and screws' },
    { name: 'Safety & PPE', nameAr: 'معدات السلامة', description: 'Helmets, vests, gloves and safety shoes' },
    { name: 'Electrical & Lighting', nameAr: 'كهرباء وإنارة', description: 'Cables, breakers, switches and work lights' },
    { name: 'Plumbing & Pipes', nameAr: 'سباكة ومواسير', description: 'PPR pipes, fittings, valves and adhesives' },
  ];
  const categoryMap: Record<string, string> = {};
  for (const c of categoriesData) {
    const existing = await prisma.category.findFirst({ where: { name: c.name } });
    if (existing) {
      categoryMap[c.name] = existing.id;
    } else {
      const created = await prisma.category.create({ data: { ...c, isActive: true } });
      categoryMap[c.name] = created.id;
    }
  }

  // 5. Brands
  const brandsData = [
    { name: 'Bosch Professional', nameAr: 'بوش بروفيشنال' },
    { name: 'Makita Tools', nameAr: 'ماكيتا' },
    { name: 'DeWalt Industrial', nameAr: 'ديوالت' },
    { name: 'Stanley FatMax', nameAr: 'ستانلي' },
    { name: 'Hilti Fasteners', nameAr: 'هيلتي' },
    { name: '3M Safety', nameAr: 'ثري إم' },
    { name: 'Schneider Electric', nameAr: 'شنايدر إلكتريك' },
    { name: 'Fischer Fixings', nameAr: 'فيشر' },
  ];
  const brandMap: Record<string, string> = {};
  for (const b of brandsData) {
    const existing = await prisma.brand.findFirst({ where: { name: b.name } });
    if (existing) {
      brandMap[b.name] = existing.id;
    } else {
      const created = await prisma.brand.create({ data: { ...b, isActive: true } });
      brandMap[b.name] = created.id;
    }
  }

  // 6. Products
  const productsData = [
    {
      sku: 'PWR-BSH-001',
      name: 'Bosch GSB 18V-50 Cordless Brushless Impact Drill',
      nameAr: 'مثقاب بوش لاسلكي 18 فولت',
      categoryId: categoryMap['Power Tools'],
      brandId: brandMap['Bosch Professional'],
      unitId: unitMap['PCS'],
      costPrice: 42.500,
      sellingPrice: 58.000,
      stockQuantity: 24,
      reorderLevel: 5,
    },
    {
      sku: 'PWR-MKT-002',
      name: 'Makita GA9020 9" 2200W Angle Grinder Heavy Duty',
      nameAr: 'صاروخ ماكيتا 9 بوصة 2200 واط',
      categoryId: categoryMap['Power Tools'],
      brandId: brandMap['Makita Tools'],
      unitId: unitMap['PCS'],
      costPrice: 31.000,
      sellingPrice: 43.500,
      stockQuantity: 18,
      reorderLevel: 4,
    },
    {
      sku: 'PWR-DWT-003',
      name: 'DeWalt D25133K 26mm SDS-Plus Rotary Hammer Drill',
      nameAr: 'هيلتي ديوالت 26 ملم 800 واط',
      categoryId: categoryMap['Power Tools'],
      brandId: brandMap['DeWalt Industrial'],
      unitId: unitMap['PCS'],
      costPrice: 38.000,
      sellingPrice: 52.000,
      stockQuantity: 15,
      reorderLevel: 3,
    },
    {
      sku: 'HND-STN-010',
      name: 'Stanley FatMax 8M/26FT Heavy Duty Tape Measure',
      nameAr: 'متر قياس ستانلي فات ماكس 8 متر',
      categoryId: categoryMap['Hand Tools'],
      brandId: brandMap['Stanley FatMax'],
      unitId: unitMap['PCS'],
      costPrice: 2.800,
      sellingPrice: 4.500,
      stockQuantity: 120,
      reorderLevel: 25,
    },
    {
      sku: 'HND-STN-011',
      name: 'Stanley Anti-Vibe 20oz Steel Claw Hammer',
      nameAr: 'شاكوش ستانلي مقاوم للاهتزاز 20 أونصة',
      categoryId: categoryMap['Hand Tools'],
      brandId: brandMap['Stanley FatMax'],
      unitId: unitMap['PCS'],
      costPrice: 4.200,
      sellingPrice: 6.750,
      stockQuantity: 45,
      reorderLevel: 10,
    },
    {
      sku: 'FAS-FSC-020',
      name: 'Fischer SX 8x40 Nylon Expansion Wall Plugs (Box of 100)',
      nameAr: 'فيشر نايلون 8×40 ملم (علبة 100 حبة)',
      categoryId: categoryMap['Fasteners & Screws'],
      brandId: brandMap['Fischer Fixings'],
      unitId: unitMap['BOX'],
      costPrice: 1.650,
      sellingPrice: 2.800,
      stockQuantity: 200,
      reorderLevel: 40,
    },
    {
      sku: 'FAS-HLT-021',
      name: 'Hilti HUS3-H 10x80 Mechanical Concrete Screw Anchors (50 pcs)',
      nameAr: 'براغي خرسانة هيلتي 10×80 (علبة 50)',
      categoryId: categoryMap['Fasteners & Screws'],
      brandId: brandMap['Hilti Fasteners'],
      unitId: unitMap['BOX'],
      costPrice: 12.000,
      sellingPrice: 18.500,
      stockQuantity: 60,
      reorderLevel: 15,
    },
    {
      sku: 'SFT-3M-030',
      name: '3M Peltor X4A Over-the-Head High Attenuation Ear Muffs',
      nameAr: 'سماعات حماية أذن ثري إم',
      categoryId: categoryMap['Safety & PPE'],
      brandId: brandMap['3M Safety'],
      unitId: unitMap['PCS'],
      costPrice: 6.500,
      sellingPrice: 9.750,
      stockQuantity: 80,
      reorderLevel: 20,
    },
    {
      sku: 'SFT-3M-031',
      name: '3M SecureFit 400 Clear Anti-Fog Protective Safety Glasses',
      nameAr: 'نظارة أمان شفافة ثري إم مقاومة للضباب',
      categoryId: categoryMap['Safety & PPE'],
      brandId: brandMap['3M Safety'],
      unitId: unitMap['PCS'],
      costPrice: 1.100,
      sellingPrice: 1.950,
      stockQuantity: 150,
      reorderLevel: 30,
    },
    {
      sku: 'ELC-SCH-040',
      name: 'Schneider Acti9 iC60N 3-Pole 32A Miniature Circuit Breaker',
      nameAr: 'قاطع كهربائي شنايدر 3 فاز 32 أمبير',
      categoryId: categoryMap['Electrical & Lighting'],
      brandId: brandMap['Schneider Electric'],
      unitId: unitMap['PCS'],
      costPrice: 7.200,
      sellingPrice: 10.500,
      stockQuantity: 70,
      reorderLevel: 15,
    },
    {
      sku: 'PLM-PPR-050',
      name: 'PPR High Pressure Cold/Hot Water Pipe 25mm x 4M (PN20)',
      nameAr: 'بايب حراري بي بي آر 25 ملم 4 متر',
      categoryId: categoryMap['Plumbing & Pipes'],
      brandId: brandMap['Fischer Fixings'],
      unitId: unitMap['PCS'],
      costPrice: 1.850,
      sellingPrice: 2.750,
      stockQuantity: 300,
      reorderLevel: 50,
    },
  ];

  const productMap: Record<string, string> = {};
  for (const p of productsData) {
    const existing = await prisma.product.findFirst({ where: { sku: p.sku } });
    if (existing) {
      productMap[p.sku] = existing.id;
    } else {
      const created = await prisma.product.create({
        data: {
          ...p,
          isActive: true,
        },
      });
      productMap[p.sku] = created.id;
    }
  }

  // 7. Customers
  const customersData = [
    {
      code: 'CUST-0001',
      name: 'Al-Ghanim International Contracting Co.',
      nameAr: 'شركة الغانم الدولية للمقاولات',
      email: 'procurement@alghanim-contracting.com',
      phone: '+965 2484 0000',
      address: 'Shuwaikh Industrial Area 2, Kuwait',
      creditLimit: 15000,
    },
    {
      code: 'CUST-0002',
      name: 'Gulf Engineering & Modern Building Systems',
      nameAr: 'مؤسسة الخليج للأنظمة الإنشائية',
      email: 'projects@gulf-eng-kw.com',
      phone: '+965 2245 1122',
      address: 'Al-Rai Industrial, Block 1, Kuwait',
      creditLimit: 8000,
    },
    {
      code: 'CUST-0003',
      name: 'Al-Noor Luxury Interiors & Fitout',
      nameAr: 'ديكورات النور للمقاولات والتجهيز',
      email: 'admin@alnoor-interiors.com',
      phone: '+965 9988 7766',
      address: 'Hawally, Beirut Street, Kuwait',
      creditLimit: 4000,
    },
    {
      code: 'CUST-0004',
      name: 'Horizon General Trading & Construction',
      nameAr: 'شركة الأفق للتجارة العامة والمقاولات',
      email: 'info@horizon-kw.com',
      phone: '+965 2471 3344',
      address: 'Sabhan Industrial Area, Kuwait',
      creditLimit: 12000,
    },
  ];

  const customerMap: Record<string, string> = {};
  for (const c of customersData) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    if (existing) {
      customerMap[c.name] = existing.id;
    } else {
      const created = await prisma.customer.create({ data: { ...c, isActive: true } });
      customerMap[c.name] = created.id;
    }
  }

  // 8. Suppliers
  const suppliersData = [
    {
      code: 'SUPP-0001',
      name: 'Middle East Hardware & Industrial Trading LLC',
      nameAr: 'الشرق الأوسط لتجارة العدد الصناعية',
      email: 'sales@me-hardware.com',
      phone: '+965 2481 9900',
      address: 'Shuwaikh Industrial 3, Canada Dry St',
    },
    {
      code: 'SUPP-0002',
      name: 'Gulf Fasteners & Tools Supply Co.',
      nameAr: 'شركة توريد البراغي والعدد الخليجية',
      email: 'orders@gulffasteners.com',
      phone: '+965 2474 5511',
      address: 'Al-Rai, Street 18',
    },
  ];
  for (const s of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.supplier.create({ data: { ...s, isActive: true } });
    }
  }

  // 9. Finance Accounts
  const financeAccounts = [
    {
      name: 'Main Cash Register',
      accountNumber: 'ACC-CASH-001',
      type: 'CASH',
      openingBalance: 1000.000,
      description: 'Shuwaikh Showroom Front Desk Cash',
      isDefault: true,
    },
    {
      name: 'National Bank of Kuwait (NBK) - Operating',
      accountNumber: 'NBK-KW-8840291',
      type: 'BANK',
      bankName: 'National Bank of Kuwait',
      openingBalance: 40000.000,
      description: 'Primary corporate trading account',
    },
    {
      name: 'Gulf Bank - Petty Cash & Expenses',
      accountNumber: 'GB-KW-194022',
      type: 'BANK',
      bankName: 'Gulf Bank',
      openingBalance: 3000.000,
      description: 'Branch daily operations and fuel expenses',
    },
  ];
  for (const fa of financeAccounts) {
    const existing = await prisma.financeAccount.findFirst({ where: { accountNumber: fa.accountNumber } });
    if (!existing) {
      await prisma.financeAccount.create({
        data: {
          ...fa,
          createdById: demoUser.id,
        } as any,
      });
    }
  }

  // 10. Sample Quotations
  const sampleCustomer = Object.values(customerMap)[0];
  const sampleProduct = Object.values(productMap)[0];
  if (sampleCustomer && sampleProduct) {
    const existingQ = await prisma.quotation.findFirst();
    if (!existingQ) {
      await prisma.quotation.create({
        data: {
          number: 'QT-2026-0001',
          customerId: sampleCustomer,
          customerName: 'Al-Ghanim International Contracting Co.',
          customerNameAr: 'شركة الغانم الدولية للمقاولات',
          userId: demoUser.id,
          salespersonId: demoUser.id,
          quotationDate: new Date(),
          validityDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
          status: 'SENT',
          totalAmount: 580.000,
          grandTotal: 580.000,
          items: {
            create: [
              {
                productId: sampleProduct,
                description: 'Bosch GSB 18V-50 Cordless Brushless Impact Drill',
                quantity: 10,
                unitPrice: 58.000,
                amount: 580.000,
              },
            ],
          },
        },
      });
    }
  }

  // 11. Sample Sales
  if (sampleCustomer && sampleProduct) {
    const existingS = await prisma.sale.findFirst();
    if (!existingS) {
      await prisma.sale.create({
        data: {
          number: 'SO-2026-0001',
          internalSONumber: 'SO-2026-0001',
          customerId: sampleCustomer,
          userId: demoUser.id,
          saleDate: new Date(),
          totalAmount: 870.000,
          netAmount: 870.000,
          paidAmount: 870.000,
          outstandingAmount: 0,
          paymentStatus: 'PAID',
          paymentMethod: 'BANK_TRANSFER',
          status: 'DELIVERED',
          items: {
            create: [
              {
                productId: sampleProduct,
                quantity: 15,
                unitPrice: 58.000,
                total: 870.000,
              },
            ],
          },
        },
      });
    }
  }

  // 12. Settings
  const existingSetting = await prisma.setting.findFirst({ where: { namespace: 'company', key: 'profile' } });
  if (!existingSetting) {
    await prisma.setting.create({
      data: {
        namespace: 'company',
        key: 'profile',
        value: {
          name: 'Shield Max General Trading Demo LLC',
          nameAr: 'شركة شيلد ماكس للتجارة العامة (تجريبي)',
          phone: '+965 2484 0000',
          email: 'demo@shieldmax.com',
          currency: 'KWD',
        },
      },
    });
  }

  await prisma.$disconnect();
}
