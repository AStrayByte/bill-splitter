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

let itemAssignments = {}; // itemIndex -> array of personIds

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

    const assignedCount = itemAssignments[index]
      ? itemAssignments[index].length
      : 0;
    const isShared = assignedCount > 1;
    const sharedIndicator = isShared
      ? ` <span class="shared-indicator">👥 Split ${assignedCount} ways</span>`
      : "";

    itemDiv.innerHTML = `
                <div class="item-header">
                    <span class="item-name">${item.quantity}x ${
      item.name
    }${sharedIndicator}</span>
                    <span class="item-price">$${item.price.toFixed(2)}</span>
                </div>
                ${modifications}
                <div class="person-selection">
                    <span>Assign to:</span>
                    ${people
                      .map(
                        (person) => `
                        <div class="person-circle color-${person.colorIndex} ${
                          itemAssignments[index] &&
                          itemAssignments[index].includes(person.id)
                            ? "selected"
                            : ""
                        }" 
                             data-item-index="${index}" data-person-id="${
                          person.id
                        }">
                            ${person.id}
                        </div>
                    `
                      )
                      .join("")}
                    <div class="add-person" data-action="add-person">+</div>
                </div>
            `;

    container.appendChild(itemDiv);
  });
}

function assignItem(itemIndex, personId) {
  // Initialize array if it doesn't exist
  if (!itemAssignments[itemIndex]) {
    itemAssignments[itemIndex] = [];
  }

  const currentAssignments = itemAssignments[itemIndex];
  const personIndex = currentAssignments.indexOf(personId);

  if (personIndex > -1) {
    // Person is already assigned, remove them
    currentAssignments.splice(personIndex, 1);

    // If no one is assigned anymore, delete the entry
    if (currentAssignments.length === 0) {
      delete itemAssignments[itemIndex];
    }
  } else {
    // Person is not assigned, add them
    currentAssignments.push(personId);
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
    if (assignedTo && assignedTo.length > 0) {
      // Split the item cost among all assigned people
      const splitCost = item.price / assignedTo.length;
      const splitItem = {
        ...item,
        price: splitCost,
        isShared: assignedTo.length > 1,
      };

      assignedTo.forEach((personId) => {
        if (personTotals[personId]) {
          personTotals[personId].itemsTotal += splitCost;
          personTotals[personId].items.push(splitItem);
        }
      });
    }
  });

  // Calculate proportional fees and discounts
  let html = "";
  let totalSum = 0;

  Object.entries(personTotals).forEach(([personId, data]) => {
    if (data.itemsTotal > 0) {
      const proportion = data.itemsTotal / receiptData.subtotal;
      const personFees = totalFees * proportion;
      const personDiscounts = totalDiscounts * proportion;
      const finalTotal = data.itemsTotal + personFees - personDiscounts;

      // Add to running total
      totalSum += finalTotal;

      // Generate items list
      const itemsHtml = data.items
        .map(
          (item) =>
            `<div class="person-item ${item.isShared ? "shared-item" : ""}">
          <span>${item.quantity}x ${item.name}${
              item.isShared ? " (shared)" : ""
            }</span>
          <span>$${item.price.toFixed(2)}</span>
        </div>`
        )
        .join("");

      html += `
                    <div class="person-total color-${data.colorIndex}">
                        <div class="person-name">${data.name}</div>
                        <div class="person-items">
                          ${itemsHtml}
                        </div>
                        <div class="breakdown-details">
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

  // Update verification section
  updateTotalsVerification(totalSum);

  // Apply current toggle state
  toggleBreakdownDetails();
}

function updateTotalsVerification(calculatedTotal) {
  const container = document.getElementById("totals-verification");

  if (!container) return;

  const orderTotal = receiptData.total;
  const difference = Math.abs(calculatedTotal - orderTotal);
  const isMatch = difference < 0.01; // Allow for small rounding differences

  let verificationHtml = "";

  if (calculatedTotal > 0) {
    verificationHtml = `
      <div class="verification-item">
        <span>Sum of Individual Totals:</span>
        <span>$${calculatedTotal.toFixed(2)}</span>
      </div>
      <div class="verification-item">
        <span>Order Total:</span>
        <span>$${orderTotal.toFixed(2)}</span>
      </div>
      <div class="verification-item ${isMatch ? "match" : "mismatch"}">
        <span>Status:</span>
        <span>${isMatch ? "✅ Totals Match!" : "⚠️ Totals Don't Match"}</span>
      </div>
      ${
        !isMatch
          ? `<div class="verification-difference">Difference: $${difference.toFixed(
              2
            )}</div>`
          : ""
      }
    `;
  }

  container.innerHTML = verificationHtml;
}

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  errorDiv.innerHTML = `<div class="error">${message}</div>`;
}

function toggleBreakdownDetails() {
  const toggle = document.getElementById("details-toggle");
  const details = document.querySelectorAll(".breakdown-details");

  details.forEach((detail) => {
    if (toggle.checked) {
      detail.classList.remove("hidden");
    } else {
      detail.classList.add("hidden");
    }
  });
}

// Initialize empty state
updateTotals();

// Add event listener for the toggle when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("details-toggle");
  if (toggle) {
    toggle.addEventListener("change", toggleBreakdownDetails);
  }

  // Add copy button event listener
  const copyBtn = document.getElementById("copy-summary-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", copyToClipboard);
  }

  // Add event delegation for person circles and add-person buttons
  const itemsContainer = document.getElementById("items-container");
  if (itemsContainer) {
    // Use click events for all devices - iOS will handle this properly with touch-action: manipulation
    itemsContainer.addEventListener("click", handleItemInteraction);

    // Add touch event as fallback for immediate feedback on mobile
    itemsContainer.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
  }
});

function handleTouchStart(event) {
  // Add visual feedback for touch - just for immediate response feel
  const personCircle = event.target.closest(".person-circle");
  const addPersonBtn = event.target.closest(".add-person");

  if (personCircle || addPersonBtn) {
    // Add a quick visual feedback class
    const target = personCircle || addPersonBtn;
    target.style.transform =
      target.style.transform.replace(/scale\([^)]*\)/, "") + " scale(0.95)";

    setTimeout(() => {
      target.style.transform = target.style.transform.replace(
        /scale\([^)]*\)/,
        ""
      );
    }, 150);
  }
}

function handleItemInteraction(event) {
  const personCircle = event.target.closest(".person-circle");
  const addPersonBtn = event.target.closest(".add-person");

  if (personCircle) {
    event.preventDefault();
    const itemIndex = parseInt(personCircle.dataset.itemIndex);
    const personId = parseInt(personCircle.dataset.personId);

    if (!isNaN(itemIndex) && !isNaN(personId)) {
      assignItem(itemIndex, personId);
    }
  } else if (addPersonBtn) {
    event.preventDefault();
    addPerson();
  }
}

function generateSummaryText() {
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();

  let summary = `🍔 BILL SPLIT SUMMARY\n`;
  summary += `📅 ${date} at ${time}\n`;
  summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Calculate totals like in updateIndividualTotals
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
      itemsTotal: 0,
      items: [],
    };
  });

  // Calculate food totals for each person
  receiptData.items.forEach((item, index) => {
    const assignedTo = itemAssignments[index];
    if (assignedTo && assignedTo.length > 0) {
      const splitCost = item.price / assignedTo.length;
      const splitItem = {
        ...item,
        price: splitCost,
        isShared: assignedTo.length > 1,
      };

      assignedTo.forEach((personId) => {
        if (personTotals[personId]) {
          personTotals[personId].itemsTotal += splitCost;
          personTotals[personId].items.push(splitItem);
        }
      });
    }
  });

  let totalSum = 0;

  // Add individual breakdowns
  Object.entries(personTotals).forEach(([personId, data]) => {
    if (data.itemsTotal > 0) {
      const proportion = data.itemsTotal / receiptData.subtotal;
      const personFees = totalFees * proportion;
      const personDiscounts = totalDiscounts * proportion;
      const finalTotal = data.itemsTotal + personFees - personDiscounts;
      totalSum += finalTotal;

      summary += `👤 ${data.name.toUpperCase()}\n`;
      summary += `─────────────────────────────────\n`;

      // List items
      data.items.forEach((item) => {
        const sharedText = item.isShared ? " (shared)" : "";
        summary += `   ${item.quantity}x ${item.name}${sharedText}\n`;
        summary += `   $${item.price.toFixed(2)}\n`;
      });

      summary += `\n   Food Total: $${data.itemsTotal.toFixed(2)}\n`;
      summary += `   Share of Fees: $${personFees.toFixed(2)}\n`;
      summary += `   Share of Discounts: -$${personDiscounts.toFixed(2)}\n`;
      summary += `   ═══════════════════════════════\n`;
      summary += `   💰 TOTAL TO PAY: $${finalTotal.toFixed(2)}\n\n`;
    }
  });

  // Add verification
  summary += `📊 VERIFICATION\n`;
  summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `Sum of Individual Totals: $${totalSum.toFixed(2)}\n`;
  summary += `Order Total: $${receiptData.total.toFixed(2)}\n`;

  const difference = Math.abs(totalSum - receiptData.total);
  const isMatch = difference < 0.01;
  summary += `Status: ${
    isMatch ? "✅ Totals Match!" : "⚠️ Difference: $" + difference.toFixed(2)
  }\n\n`;

  summary += `Generated by Uber Eats Bill Splitter`;

  return summary;
}

async function copyToClipboard() {
  const copyBtn = document.getElementById("copy-summary-btn");

  try {
    const summaryText = generateSummaryText();

    if (navigator.clipboard && window.isSecureContext) {
      // Use modern clipboard API
      await navigator.clipboard.writeText(summaryText);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = summaryText;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }

    // Show success feedback
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "✓ Copied!";
    copyBtn.classList.add("copied");

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove("copied");
    }, 2000);
  } catch (err) {
    console.error("Failed to copy: ", err);
    // Show error feedback
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "❌ Copy Failed";

    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  }
}

function handleItemInteraction(event) {
  // Prevent double firing on devices that support both touch and click
  if (event.type === "touchstart" && event.target.dataset.lastTouch) {
    return;
  }

  // Mark as touched to prevent click event
  if (event.type === "touchstart") {
    event.target.dataset.lastTouch = Date.now();
    // Clean up after a short delay
    setTimeout(() => {
      delete event.target.dataset.lastTouch;
    }, 500);
  }

  const personCircle = event.target.closest(".person-circle");
  const addPersonBtn = event.target.closest(".add-person");

  if (personCircle) {
    event.preventDefault();
    const itemIndex = parseInt(personCircle.dataset.itemIndex);
    const personId = parseInt(personCircle.dataset.personId);

    if (!isNaN(itemIndex) && !isNaN(personId)) {
      assignItem(itemIndex, personId);
    }
  } else if (addPersonBtn) {
    event.preventDefault();
    addPerson();
  }
}
