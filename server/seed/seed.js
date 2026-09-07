require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const User = require("../models/User");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Combo = require("../models/Combo");
const Order = require("../models/Order");
const AuditLog = require("../models/AuditLog");
const Counter = require("../models/Counter");

const { computeOrderTotals } = require("../services/orderService");
const generateOrderNumber = require("../utils/generateOrderNumber");
const { generateCustomerToken } = require("../utils/generateToken");
const { ROLES } = require("../utils/constants");

async function run() {
  await connectDB();

  console.log("Clearing existing collections...");
  await Promise.all([
    User.deleteMany({}),
    Customer.deleteMany({}),
    Product.deleteMany({}),
    Combo.deleteMany({}),
    Order.deleteMany({}),
    AuditLog.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  console.log("Creating users...");
  const superadmin = await User.create({
    name: "MindFulAI Superadmin",
    email: "superadmin@mindfulai.co.in",
    passwordHash: await User.hashPassword("MindFulAI@03"),
    role: ROLES.SUPERADMIN,
  });

  const admin1 = await User.create({
    name: "MindFulAI Admin",
    email: "admin@mindfulai.co.in",
    passwordHash: await User.hashPassword("MindFulAI@03"),
    role: ROLES.ADMIN,
  });

  const admin2 = admin1;

  console.log("Creating products...");
  const products = await Product.insertMany([
    {
      name: "Classic Team Jersey",
      sku: "JER-001",
      description: "Breathable polyester team jersey",
      price: 1200,
      discountPercentage: 5,
      isActive: true,
    },
    {
      name: "Premium Track Jacket",
      sku: "JAC-002",
      description: "Full-zip track jacket with embroidery",
      price: 2500,
      discountPercentage: 10,
      isActive: true,
    },
    {
      name: "Custom Cap",
      sku: "CAP-003",
      description: "Embroidered team cap",
      price: 500,
      discountPercentage: 0,
      isActive: true,
    },
    {
      name: "Sports Duffel Bag",
      sku: "BAG-004",
      description: "Large capacity duffel with team logo",
      price: 1800,
      discountPercentage: 8,
      isActive: true,
    },
    {
      name: "Performance Shorts",
      sku: "SHR-005",
      description: "Moisture-wicking performance shorts",
      price: 800,
      discountPercentage: 0,
      isActive: false,
    },
  ]);

  console.log("Creating combos...");
  const combos = await Combo.insertMany([
    {
      name: "Team Starter Pack",
      description: "Jersey + Cap bundle",
      products: [products[0]._id, products[2]._id],
      price: 1600,
      discountPercentage: 12,
      isActive: true,
    },
    {
      name: "Champion Combo",
      description: "Jersey + Track Jacket + Bag",
      products: [products[0]._id, products[1]._id, products[3]._id],
      price: 5000,
      discountPercentage: 15,
      isActive: true,
    },
  ]);

  console.log("Creating customers...");
  const customers = await Customer.insertMany([
    {
      name: "Priya Sharma",
      phone: "9876543210",
      email: "priya.sharma@example.com",
      address: "12 MG Road, Bengaluru, KA 560001",
    },
    {
      name: "Karan Singh",
      phone: "9123456780",
      email: "karan.singh@example.com",
      address: "45 Park Street, Kolkata, WB 700016",
    },
    {
      name: "Neha Gupta",
      phone: "9988776655",
      email: "neha.gupta@example.com",
      address: "7 Linking Road, Mumbai, MH 400050",
    },
    {
      name: "Vikram Rao",
      phone: "9012345678",
      email: "vikram.rao@example.com",
      address: "22 Anna Salai, Chennai, TN 600002",
    },
    {
      name: "Harish",
      phone: "0000000000",
      email: "harish@example.com",
      address: "Address to be updated",
    },
  ]);

  console.log("Creating sample orders across workflow stages...");

  async function makeOrder({
    customer,
    ambassadorId,
    teamId,
    assignedAdmin,
    itemDefs,
    workflowStage,
    extra = {},
  }) {
    const resolvedItems = itemDefs.map(({ doc, itemType, quantity }) => ({
      itemType,
      itemModel: itemType === "PRODUCT" ? "Product" : "Combo",
      refId: doc._id,
      name: doc.name,
      quantity,
      unitPrice: doc.price,
      discountPercentage: doc.discountPercentage,
    }));
    const totals = computeOrderTotals(resolvedItems);
    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      ambassadorId,
      teamId,
      customer: customer._id,
      items: totals.items,
      amount: totals.amount,
      discountPercentage: totals.discountPercentage,
      finalAmount: totals.finalAmount,
      assignedAdmin: assignedAdmin._id,
      workflowStage,
      customerToken: generateCustomerToken(),
      ...extra,
    });

    await AuditLog.create({
      user: assignedAdmin._id,
      userName: assignedAdmin.name,
      action: "ORDER_CREATED",
      entityType: "Order",
      entityId: order._id,
      entityLabel: order.orderNumber,
      newValue: { amount: order.amount, finalAmount: order.finalAmount },
    });

    return order;
  }

  const order1 = await makeOrder({
    customer: customers[0],
    ambassadorId: "VM26-A01",
    teamId: "VM26-T01",
    assignedAdmin: admin1,
    itemDefs: [{ doc: products[0], itemType: "PRODUCT", quantity: 2 }],
    workflowStage: "PHOTO_VERIFICATION",
  });

  const order2 = await makeOrder({
    customer: customers[1],
    ambassadorId: "VM26-A02",
    teamId: "VM26-T02",
    assignedAdmin: admin1,
    itemDefs: [{ doc: combos[0], itemType: "COMBO", quantity: 1 }],
    workflowStage: "DESIGN",
    extra: {
      photoVerification: {
        files: [
          {
            url: "/uploads/photos/sample-placeholder.jpg",
            originalName: "sample-placeholder.jpg",
            uploadedBy: admin1._id,
          },
        ],
        status: "VERIFIED",
        verifiedBy: superadmin._id,
        verifiedAt: new Date(),
      },
    },
  });

  const order3 = await makeOrder({
    customer: customers[2],
    ambassadorId: "VM26-A03",
    teamId: "VM26-T03",
    assignedAdmin: admin2,
    itemDefs: [{ doc: products[1], itemType: "PRODUCT", quantity: 1 }],
    workflowStage: "PRODUCTION",
    extra: {
      photoVerification: {
        status: "VERIFIED",
        verifiedBy: superadmin._id,
        verifiedAt: new Date(),
      },
      design: {
        versions: [
          {
            version: 1,
            url: "/uploads/design/sample-design-v1.jpg",
            uploadedBy: admin2._id,
          },
        ],
      },
    },
  });

  const order4 = await makeOrder({
    customer: customers[3],
    ambassadorId: "VM26-A04",
    teamId: "VM26-T04",
    assignedAdmin: admin2,
    itemDefs: [{ doc: combos[1], itemType: "COMBO", quantity: 1 }],
    workflowStage: "PRODUCTION",
    extra: {
      photoVerification: {
        status: "VERIFIED",
        verifiedBy: superadmin._id,
        verifiedAt: new Date(),
      },
      design: {
        versions: [
          {
            version: 1,
            url: "/uploads/design/sample-design-v1.jpg",
            uploadedBy: admin2._id,
            locked: true,
          },
        ],
      },
      customerApproval: {
        status: "APPROVED",
        timestamp: new Date(),
        approvedVersion: 1,
      },
      production: { status: "IN_PROGRESS", startedAt: new Date() },
      paymentStatus: "PAID",
    },
  });

  const order5 = await makeOrder({
    customer: customers[0],
    ambassadorId: "VM26-A01",
    teamId: "VM26-T01",
    assignedAdmin: admin1,
    itemDefs: [{ doc: products[3], itemType: "PRODUCT", quantity: 3 }],
    workflowStage: "DELIVERY",
    extra: {
      photoVerification: {
        status: "VERIFIED",
        verifiedBy: superadmin._id,
        verifiedAt: new Date(),
      },
      design: {
        versions: [
          {
            version: 1,
            url: "/uploads/design/sample-design-v1.jpg",
            uploadedBy: admin1._id,
            locked: true,
          },
        ],
      },
      customerApproval: {
        status: "APPROVED",
        timestamp: new Date(),
        approvedVersion: 1,
      },
      production: {
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
      },
      qc: {
        status: "PASSED",
        checkedBy: superadmin._id,
        checkedAt: new Date(),
      },
      packing: { status: "PACKED", packedBy: admin1._id, packedAt: new Date() },
      deliveryStatus: "IN_TRANSIT",
      tracking: {
        courier: "BlueDart",
        trackingNumber: "BD123456789IN",
        trackingUrl: "https://bluedart.com/track/BD123456789IN",
        updatedAt: new Date(),
        updatedBy: superadmin._id,
      },
      paymentStatus: "PAID",
    },
  });

  const order6 = await makeOrder({
    customer: customers[1],
    ambassadorId: "VM26-A02",
    teamId: "VM26-T05",
    assignedAdmin: admin2,
    itemDefs: [
      { doc: products[0], itemType: "PRODUCT", quantity: 1 },
      { doc: products[2], itemType: "PRODUCT", quantity: 1 },
    ],
    workflowStage: "COMPLETED",
    extra: {
      photoVerification: {
        status: "VERIFIED",
        verifiedBy: superadmin._id,
        verifiedAt: new Date(),
      },
      design: {
        versions: [
          {
            version: 1,
            url: "/uploads/design/sample-design-v1.jpg",
            uploadedBy: admin2._id,
            locked: true,
          },
        ],
      },
      customerApproval: {
        status: "APPROVED",
        timestamp: new Date(),
        approvedVersion: 1,
      },
      production: {
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
      },
      qc: {
        status: "PASSED",
        checkedBy: superadmin._id,
        checkedAt: new Date(),
      },
      packing: { status: "PACKED", packedBy: admin2._id, packedAt: new Date() },
      deliveryStatus: "DELIVERED",
      tracking: {
        courier: "Delhivery",
        trackingNumber: "DL987654321IN",
        trackingUrl: "https://delhivery.com/track/DL987654321IN",
        updatedAt: new Date(),
        updatedBy: superadmin._id,
      },
      paymentStatus: "PAID",
    },
  });

  console.log("\nSeed complete.\n");
  console.log("Login credentials:");
  console.log("  Superadmin -> superadmin@mindfulai.co.in / MindFulAI@03");
  console.log("  Admin      -> admin@mindfulai.co.in / MindFulAI@03");
  console.log("\nSample customer tracking links:");
  for (const o of [order1, order2, order3, order4, order5, order6]) {
    console.log(
      `  ${o.orderNumber} (${o.workflowStage}) -> /order/${o.customerToken}`,
    );
  }

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
