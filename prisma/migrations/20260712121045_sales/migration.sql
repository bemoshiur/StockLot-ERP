-- CreateTable
CREATE TABLE "SalesChallan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challanNo" TEXT,
    "saleDate" DATETIME NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "locationId" TEXT,
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesChallan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesChallan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challanId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "unitCostSnapshot" DECIMAL NOT NULL,
    "lineAmount" DECIMAL NOT NULL,
    "lineGrossProfit" DECIMAL NOT NULL,
    CONSTRAINT "SaleLine_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "SalesChallan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleLine_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "ProductStyle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challanId" TEXT NOT NULL,
    "receiptDate" DATETIME NOT NULL,
    "amountCollected" DECIMAL NOT NULL,
    "discountOrWaiver" DECIMAL NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "notes" TEXT,
    "collectedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentReceipt_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "SalesChallan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceivableEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "challanId" TEXT,
    "entryType" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "entryDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReceivableEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SalesChallan_periodMonth_idx" ON "SalesChallan"("periodMonth");

-- CreateIndex
CREATE INDEX "SalesChallan_saleDate_idx" ON "SalesChallan"("saleDate");

-- CreateIndex
CREATE INDEX "SalesChallan_customerId_idx" ON "SalesChallan"("customerId");

-- CreateIndex
CREATE INDEX "SaleLine_challanId_idx" ON "SaleLine"("challanId");

-- CreateIndex
CREATE INDEX "SaleLine_styleId_idx" ON "SaleLine"("styleId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_challanId_idx" ON "PaymentReceipt"("challanId");

-- CreateIndex
CREATE INDEX "ReceivableEntry_customerId_idx" ON "ReceivableEntry"("customerId");

-- CreateIndex
CREATE INDEX "ReceivableEntry_challanId_idx" ON "ReceivableEntry"("challanId");
