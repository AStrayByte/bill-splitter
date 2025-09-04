let receiptData = {
  items: [],
  subtotal: 0,
  fees: {},
  discounts: {},
  total: 0,
};

let people = [
  { id: 1, name: "Person 1", colorIndex: 0 },
  { id: 2, name: "Person 2", colorIndex: 1 },
];

let itemAssignments = {}; // itemIndex -> personId

function parseReceipt() {
  const input = document.querySelector(".receipt-input").value;
  const errorDiv = document.getElementById("error-message");

  if (!input.trim()) {
    showError("Please paste your Uber Eats receipt");
    return;
  }

  try {
    parseReceiptText(input);
    renderItems();
    updateTotals();
    errorDiv.innerHTML = "";
  } catch (error) {
    showError("Error parsing receipt: " + error.message);
  }
}

function parseReceiptText(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  receiptData = {
    items: [],
    subtotal: 0,
    fees: {},
    discounts: {},
    total: 0,
  };

  let currentItem = null;
  let inItemSection = false;
  let inFeesSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

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

    // Check for quantity at start of line (just a number)
    if (/^\d+$/.test(line) && inItemSection && !inFeesSection) {
      // Save previous item if exists
      if (currentItem) {
        receiptData.items.push(currentItem);
      }

      const quantity = parseInt(line);
      const nextLine = lines[i + 1];
      const priceLine = lines[i + 2];

      if (nextLine && priceLine) {
        const priceMatch = priceLine.match(/\$(\d+\.\d{2})/);
        if (priceMatch) {
          currentItem = {
            quantity: quantity,
            name: nextLine,
            price: parseFloat(priceMatch[1]),
            modifications: [],
          };
          i += 2; // Skip the name and price lines
        }
      }
      continue;
    }

    // Check for modifications (lines that start with whitespace or special chars)
    if (
      currentItem &&
      (line.startsWith(" ") || line.startsWith("\t") || line.startsWith("#"))
    ) {
      currentItem.modifications.push(line.trim());
      continue;
    }

    // Check for fee section indicators
    if (line.includes("Subtotal")) {
      if (currentItem) {
        receiptData.items.push(currentItem);
        currentItem = null;
      }
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
}

function renderItems() {
  const container = document.getElementById("items-container");
  container.innerHTML = "";

  receiptData.items.forEach((item, index) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "item";

    const modifications =
      item.modifications.length > 0
        ? `<div class="item-details">${item.modifications.join("<br>")}</div>`
        : "";

    itemDiv.innerHTML = `
                <div class="item-header">
                    <span class="item-name">${item.quantity}x ${
      item.name
    }</span>
                    <span class="item-price">$${item.price.toFixed(2)}</span>
                </div>
                ${modifications}
                <div class="person-selection">
                    <span>Assign to:</span>
                    ${people
                      .map(
                        (person) => `
                        <div class="person-circle color-${person.colorIndex} ${
                          itemAssignments[index] === person.id ? "selected" : ""
                        }" 
                             onclick="assignItem(${index}, ${person.id})">
                            ${person.id}
                        </div>
                    `
                      )
                      .join("")}
                    <div class="add-person" onclick="addPerson()">+</div>
                </div>
            `;

    container.appendChild(itemDiv);
  });
}

function assignItem(itemIndex, personId) {
  if (itemAssignments[itemIndex] === personId) {
    // Unassign if clicking the same person
    delete itemAssignments[itemIndex];
  } else {
    itemAssignments[itemIndex] = personId;
  }
  renderItems();
  updateTotals();
}

function addPerson() {
  const newId = people.length + 1;
  const newColorIndex = people.length; // This will give us the next color in sequence
  people.push({
    id: newId,
    name: `Person ${newId}`,
    colorIndex: newColorIndex % 10, // Cycle through 10 colors
  });
  renderItems();
  updateTotals();
}

function updateTotals() {
  updateOrderSummary();
  updateIndividualTotals();
}

function updateOrderSummary() {
  const container = document.getElementById("order-summary");

  const totalFees = Object.values(receiptData.fees).reduce(
    (sum, fee) => sum + fee,
    0
  );
  const totalDiscounts = Object.values(receiptData.discounts).reduce(
    (sum, discount) => sum + discount,
    0
  );

  let html = `
            <div class="summary-item">
                <span>Subtotal:</span>
                <span>$${receiptData.subtotal.toFixed(2)}</span>
            </div>
        `;

  // Add fees
  Object.entries(receiptData.fees).forEach(([name, amount]) => {
    html += `
                <div class="summary-item">
                    <span>${name}:</span>
                    <span>$${amount.toFixed(2)}</span>
                </div>
            `;
  });

  // Add discounts
  Object.entries(receiptData.discounts).forEach(([name, amount]) => {
    html += `
                <div class="summary-item">
                    <span>${name}:</span>
                    <span>-$${amount.toFixed(2)}</span>
                </div>
            `;
  });

  html += `
            <div class="summary-item">
                <span>Total:</span>
                <span>$${receiptData.total.toFixed(2)}</span>
            </div>
        `;

  container.innerHTML = html;
}

function updateIndividualTotals() {
  const container = document.getElementById("individual-totals");

  // Calculate each person's totals
  const personTotals = {};
  const totalFees = Object.values(receiptData.fees).reduce(
    (sum, fee) => sum + fee,
    0
  );
  const totalDiscounts = Object.values(receiptData.discounts).reduce(
    (sum, discount) => sum + discount,
    0
  );

  people.forEach((person) => {
    personTotals[person.id] = {
      name: person.name,
      colorIndex: person.colorIndex,
      itemsTotal: 0,
      items: [],
    };
  });

  // Calculate food totals for each person
  receiptData.items.forEach((item, index) => {
    const assignedTo = itemAssignments[index];
    if (assignedTo && personTotals[assignedTo]) {
      personTotals[assignedTo].itemsTotal += item.price;
      personTotals[assignedTo].items.push(item);
    }
  });

  // Calculate proportional fees and discounts
  let html = "";

  Object.entries(personTotals).forEach(([personId, data]) => {
    if (data.itemsTotal > 0) {
      const proportion = data.itemsTotal / receiptData.subtotal;
      const personFees = totalFees * proportion;
      const personDiscounts = totalDiscounts * proportion;
      const finalTotal = data.itemsTotal + personFees - personDiscounts;

      html += `
                    <div class="person-total color-${data.colorIndex}">
                        <div class="person-name">${data.name}</div>
                        <div class="breakdown-item">
                            <span>Food Total:</span>
                            <span>$${data.itemsTotal.toFixed(2)}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Share of Fees (${(proportion * 100).toFixed(
                              1
                            )}%):</span>
                            <span>$${personFees.toFixed(2)}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Share of Discounts:</span>
                            <span>-$${personDiscounts.toFixed(2)}</span>
                        </div>
                        <div class="breakdown-item final-total">
                            <span>Total to Pay:</span>
                            <span>$${finalTotal.toFixed(2)}</span>
                        </div>
                    </div>
                `;
    }
  });

  if (!html) {
    html =
      '<p style="text-align: center; color: #666; font-style: italic;">Assign items to people to see totals</p>';
  }

  container.innerHTML = html;
}

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  errorDiv.innerHTML = `<div class="error">${message}</div>`;
}

// Initialize empty state
updateTotals();
