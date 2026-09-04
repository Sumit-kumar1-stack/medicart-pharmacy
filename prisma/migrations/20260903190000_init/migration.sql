-- Initial MediCart schema. Generated to match prisma/schema.prisma.
CREATE TYPE "Role" AS ENUM ('CUSTOMER','PHARMACIST','INVENTORY_MANAGER','ORDER_MANAGER','ADMIN','SUPER_ADMIN');
CREATE TYPE "PrescriptionStatus" AS ENUM ('UPLOADED','UNDER_REVIEW','APPROVED','REJECTED','NEEDS_CLARIFICATION','EXPIRED');
CREATE TYPE "OrderStatus" AS ENUM ('PRESCRIPTION_REVIEW','PAYMENT_PENDING','CONFIRMED','PICKING','PACKED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','REFUND_PENDING','REFUNDED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','PAID','FAILED','REFUNDED');
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE','NEAR_EXPIRY','EXPIRED','QUARANTINED','RECALLED');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "phone" TEXT, "role" "Role" NOT NULL DEFAULT 'CUSTOMER', "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId","expiresAt");

CREATE TABLE "Category" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

CREATE TABLE "Product" (
  "id" TEXT PRIMARY KEY, "slug" TEXT NOT NULL, "name" TEXT NOT NULL, "genericName" TEXT, "brandName" TEXT,
  "manufacturer" TEXT NOT NULL, "composition" TEXT, "strength" TEXT, "dosageForm" TEXT, "packSize" TEXT,
  "description" TEXT NOT NULL, "pricePaise" INTEGER NOT NULL, "mrpPaise" INTEGER NOT NULL,
  "prescriptionRequired" BOOLEAN NOT NULL DEFAULT false, "active" BOOLEAN NOT NULL DEFAULT true, "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_categoryId_active_idx" ON "Product"("categoryId","active");
CREATE INDEX "Product_name_idx" ON "Product"("name");

CREATE TABLE "InventoryBatch" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "batchNumber" TEXT NOT NULL, "manufacturedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL, "purchasePricePaise" INTEGER NOT NULL, "quantityReceived" INTEGER NOT NULL,
  "quantityAvailable" INTEGER NOT NULL, "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE', "supplierName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryBatch_productId_batchNumber_key" ON "InventoryBatch"("productId","batchNumber");
CREATE INDEX "InventoryBatch_productId_status_expiresAt_idx" ON "InventoryBatch"("productId","status","expiresAt");

CREATE TABLE "CartItem" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "productId" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CartItem_userId_productId_key" ON "CartItem"("userId","productId");

CREATE TABLE "Prescription" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "fileKey" TEXT NOT NULL, "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL, "status" "PrescriptionStatus" NOT NULL DEFAULT 'UPLOADED', "reviewerId" TEXT,
  "reviewedAt" TIMESTAMP(3), "reviewNote" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Prescription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Prescription_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Prescription_userId_status_createdAt_idx" ON "Prescription"("userId","status","createdAt");
CREATE INDEX "Prescription_status_createdAt_idx" ON "Prescription"("status","createdAt");

CREATE TABLE "PrescriptionItem" (
  "id" TEXT PRIMARY KEY, "prescriptionId" TEXT NOT NULL, "productId" TEXT NOT NULL, "maxQuantity" INTEGER,
  CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PrescriptionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PrescriptionItem_prescriptionId_productId_key" ON "PrescriptionItem"("prescriptionId","productId");

CREATE TABLE "Order" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL, "userId" TEXT NOT NULL, "prescriptionId" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'PAYMENT_PENDING', "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "subtotalPaise" INTEGER NOT NULL, "deliveryPaise" INTEGER NOT NULL, "discountPaise" INTEGER NOT NULL DEFAULT 0,
  "totalPaise" INTEGER NOT NULL, "addressJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Order_publicId_key" ON "Order"("publicId");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId","createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status","createdAt");

CREATE TABLE "OrderItem" (
  "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL, "productId" TEXT NOT NULL, "nameSnapshot" TEXT NOT NULL,
  "unitPricePaise" INTEGER NOT NULL, "quantity" INTEGER NOT NULL, "batchSnapshot" TEXT,
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "OrderStatusHistory" (
  "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL, "status" "OrderStatus" NOT NULL, "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId","createdAt");

CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId","createdAt");

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY, "actorId" TEXT, "action" TEXT NOT NULL, "resourceType" TEXT NOT NULL, "resourceId" TEXT,
  "metadata" JSONB, "ipAddress" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_resourceType_resourceId_createdAt_idx" ON "AuditLog"("resourceType","resourceId","createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId","createdAt");
