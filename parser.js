// Extract the parsing logic from script.js for testing
function parseReceiptText(text) {
  const lines = text.split("\n");

  let receiptData = {
    items: [],
    subtotal: 0,
    fees: {},
    discounts: {},
    total: 0,
  };

  let currentItem = null;
  let lastItemGroup = []; // Track items from the last quantity group for modifications
  let inItemSection = false;
  let inFeesSection = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip empty lines
    if (!line) continue;

    // Skip header info
    if (line.includes("Total") && line.includes("$") && !inFeesSection) {
      const match = line.match(/\$(\d+\.\d{2})/);
      if (match) {
        receiptData.total = parseFloat(match[1]);
      }
      continue;
    }

    if (line.includes("You saved") || line.includes("promos")) {
      inItemSection = true;
      continue;
    }

    // Check for modifications BEFORE trimming (lines that start with whitespace)
    if (
      (currentItem || lastItemGroup.length > 0) &&
      inItemSection &&
      !inFeesSection &&
      (rawLine.startsWith(" ") || rawLine.startsWith("\t"))
    ) {
      if (currentItem) {
        currentItem.modifications.push(line);
      } else if (lastItemGroup.length > 0) {
        // Apply modification to all items in the last group
        lastItemGroup.forEach((item) => {
          item.modifications.push(line);
        });
      }
      continue;
    }

    // Check for quantity at start of line (just a number)
    if (/^\d+$/.test(line) && inItemSection && !inFeesSection) {
      // Save previous item if exists
      if (currentItem) {
        receiptData.items.push(currentItem);
      }

      const quantity = parseInt(line);
      let nextLine = lines[i + 1];
      let priceLine = lines[i + 2];

      // Handle indented item names and prices
      if (nextLine && nextLine.startsWith("\t")) {
        nextLine = nextLine.trim();
      }
      if (priceLine && priceLine.startsWith("\t")) {
        priceLine = priceLine.trim();
      }

      if (nextLine && priceLine) {
        const priceMatch = priceLine.match(/\$(\d+\.\d{2})/);
        if (priceMatch) {
          const totalPrice = parseFloat(priceMatch[1]);
          const pricePerItem = totalPrice / quantity;

          // Clear the last item group and create new individual items
          lastItemGroup = [];

          // Create individual items for each quantity
          for (let q = 0; q < quantity; q++) {
            const newItem = {
              quantity: 1,
              name: nextLine,
              price: pricePerItem,
              modifications: [],
            };
            receiptData.items.push(newItem);
            lastItemGroup.push(newItem);
          }

          currentItem = null; // Reset current item since we've added them all
          i += 2; // Skip the name and price lines
        }
      }
      continue;
    }

    // Check for fee section indicators
    if (line.includes("Subtotal")) {
      if (currentItem) {
        receiptData.items.push(currentItem);
        currentItem = null;
      }
      lastItemGroup = []; // Clear the last item group
      inItemSection = false;
      inFeesSection = true;

      const match = line.match(/\$(\d+\.\d{2})/);
      if (match) {
        receiptData.subtotal = parseFloat(match[1]);
      }
      continue;
    }

    // Parse fees and discounts
    if (inFeesSection) {
      const feeMatch = line.match(/^(.+?)\s+\$(\d+\.\d{2})$/);
      const discountMatch = line.match(/^(.+?)\s+-\$(\d+\.\d{2})$/);

      if (feeMatch) {
        const [, name, amount] = feeMatch;
        receiptData.fees[name.trim()] = parseFloat(amount);
      } else if (discountMatch) {
        const [, name, amount] = discountMatch;
        receiptData.discounts[name.trim()] = parseFloat(amount);
      }
    }
  }

  // Add the last item if exists
  if (currentItem) {
    receiptData.items.push(currentItem);
  }

  if (receiptData.items.length === 0) {
    throw new Error("No items found in receipt");
  }

  return receiptData;
}

module.exports = { parseReceiptText };
