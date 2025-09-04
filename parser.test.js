const { parseReceiptText } = require("./parser");

describe("Receipt Parser", () => {
  describe("Quantity splitting", () => {
    test("should split items with quantity > 1 into separate individual items", () => {
      const receipt = `Total	$20.75
You saved $14.37 on this order with Uber One and promos
 
2
	Chicken Tikka Leg
	$23.98
1
	Butter Naan
	$1.99
 
Subtotal	$25.97
Delivery Fee 	$0.99
Service Fee 	$4.16
Tax	$1.15
Tip	$2.86
Delivery Discount	-$0.99
Membership Benefit	-$1.40
Special Offers	-$11.99`;

      const result = parseReceiptText(receipt);

      // Should have 3 items total: 2 Chicken Tikka Leg + 1 Butter Naan
      expect(result.items).toHaveLength(3);

      // First two items should be Chicken Tikka Leg at $11.99 each
      expect(result.items[0]).toEqual({
        quantity: 1,
        name: "Chicken Tikka Leg",
        price: 11.99,
        modifications: [],
      });

      expect(result.items[1]).toEqual({
        quantity: 1,
        name: "Chicken Tikka Leg",
        price: 11.99,
        modifications: [],
      });

      // Third item should be Butter Naan at $1.99
      expect(result.items[2]).toEqual({
        quantity: 1,
        name: "Butter Naan",
        price: 1.99,
        modifications: [],
      });

      // Verify totals
      expect(result.subtotal).toBe(25.97);
      expect(result.total).toBe(20.75);
    });

    test("should handle original KALAMAKIA PORK KABOBS example", () => {
      const receipt = `Total	$99.98
You saved $13.17 on this order with Uber One and promos
 
2
	KALAMAKIA PORK KABOBS
	$16.53
 	KALAMAKIA PORK KABOBS MODS
 	No Tzatziki** $0.00
 	#Extra Pita Bread $1.00
 	Mini Kabob Size
 	3-Three $15.53
1
	RICE
	$5.18
 
Subtotal	$81.91
Delivery Fee 	$4.99
Service Fee 	$13.11
Tax	$6.75
Tip	$6.40
Delivery Discount	-$4.99
Membership Benefit	-$8.19`;

      const result = parseReceiptText(receipt);

      // Should have 3 items total: 2 KALAMAKIA PORK KABOBS + 1 RICE
      expect(result.items).toHaveLength(3);

      // First two items should be KALAMAKIA PORK KABOBS at $8.265 each
      expect(result.items[0]).toEqual({
        quantity: 1,
        name: "KALAMAKIA PORK KABOBS",
        price: 8.265,
        modifications: [
          "KALAMAKIA PORK KABOBS MODS",
          "No Tzatziki** $0.00",
          "#Extra Pita Bread $1.00",
          "Mini Kabob Size",
          "3-Three $15.53",
        ],
      });

      expect(result.items[1]).toEqual({
        quantity: 1,
        name: "KALAMAKIA PORK KABOBS",
        price: 8.265,
        modifications: [
          "KALAMAKIA PORK KABOBS MODS",
          "No Tzatziki** $0.00",
          "#Extra Pita Bread $1.00",
          "Mini Kabob Size",
          "3-Three $15.53",
        ],
      });

      // Third item should be RICE
      expect(result.items[2]).toEqual({
        quantity: 1,
        name: "RICE",
        price: 5.18,
        modifications: [],
      });
    });

    test("should handle single quantity items correctly", () => {
      const receipt = `Total	$10.00
You saved $5.00 on this order with Uber One and promos
 
1
	Single Item
	$8.00
 
Subtotal	$8.00
Tax	$2.00`;

      const result = parseReceiptText(receipt);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        quantity: 1,
        name: "Single Item",
        price: 8.0,
        modifications: [],
      });
    });

    test("should handle multiple different quantities", () => {
      const receipt = `Total	$50.00
You saved $10.00 on this order with Uber One and promos
 
3
	Item A
	$15.00
2
	Item B
	$20.00
1
	Item C
	$5.00
 
Subtotal	$40.00
Tax	$10.00`;

      const result = parseReceiptText(receipt);

      // Should have 6 items total: 3 Item A + 2 Item B + 1 Item C
      expect(result.items).toHaveLength(6);

      // Check Item A (3 instances at $5 each)
      for (let i = 0; i < 3; i++) {
        expect(result.items[i]).toEqual({
          quantity: 1,
          name: "Item A",
          price: 5.0,
          modifications: [],
        });
      }

      // Check Item B (2 instances at $10 each)
      for (let i = 3; i < 5; i++) {
        expect(result.items[i]).toEqual({
          quantity: 1,
          name: "Item B",
          price: 10.0,
          modifications: [],
        });
      }

      // Check Item C (1 instance at $5)
      expect(result.items[5]).toEqual({
        quantity: 1,
        name: "Item C",
        price: 5.0,
        modifications: [],
      });
    });
  });

  describe("Error handling", () => {
    test("should throw error for empty receipt", () => {
      expect(() => parseReceiptText("")).toThrow("No items found in receipt");
    });

    test("should throw error for receipt with no items", () => {
      const receipt = `Total	$10.00
Subtotal	$8.00
Tax	$2.00`;

      expect(() => parseReceiptText(receipt)).toThrow(
        "No items found in receipt"
      );
    });
  });

  describe("Fees and discounts parsing", () => {
    test("should correctly parse fees and discounts", () => {
      const receipt = `Total	$20.75
You saved $14.37 on this order with Uber One and promos
 
1
	Test Item
	$10.00
 
Subtotal	$10.00
Delivery Fee 	$0.99
Service Fee 	$4.16
Tax	$1.15
Tip	$2.86
Delivery Discount	-$0.99
Membership Benefit	-$1.40
Special Offers	-$11.99`;

      const result = parseReceiptText(receipt);

      expect(result.fees).toEqual({
        "Delivery Fee": 0.99,
        "Service Fee": 4.16,
        Tax: 1.15,
        Tip: 2.86,
      });

      expect(result.discounts).toEqual({
        "Delivery Discount": 0.99,
        "Membership Benefit": 1.4,
        "Special Offers": 11.99,
      });
    });
  });
});
