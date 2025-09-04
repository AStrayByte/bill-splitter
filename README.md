# 🍔 Bill Splitter

Easily split your Uber Eats bills among friends! Paste your receipt and fairly divide costs including fees and discounts.

## Features

- ✅ Split items with quantity > 1 into separate individual items
- ✅ Handle item modifications correctly
- ✅ Parse fees, taxes, and discounts
- ✅ Fair cost distribution among multiple people
- ✅ Easy assignment of items to people

## Development

### Running Tests

```bash
npm install
npm test
```

### Test Coverage

The parser is thoroughly tested with unit tests that verify:

- Quantity splitting (items with quantity > 1 become separate items)
- Modification parsing (item customizations)
- Fee and discount parsing
- Error handling for invalid receipts

### GitHub Actions

Tests automatically run on:

- Push to `main` or `develop` branches
- Pull requests to `main`
- Multiple Node.js versions (18.x, 20.x)

## Usage

1. Open `index.html` in your browser
2. Paste your Uber Eats receipt in the text area
3. Click "Parse Receipt"
4. Assign items to people by clicking their numbers
5. View individual totals and split costs

## Example Receipt Format

```
Total	$20.75
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
```

The parser will automatically split the 2 Chicken Tikka Legs into separate items at $11.99 each.

[Live Site Here](https://astraybyte.github.io/bill-splitter/)

An easy to use app to split bills with friends from apps like ubereats

## Demo

See the bill splitter in action:

https://github.com/user-attachments/assets/demo.mp4

_Can't see the video? [View it directly](./docs/assets/video/demo.mp4)_

## Features

- 🍔 **Easy Receipt Parsing** - Simply paste your Uber Eats receipt
- 👥 **Multi-Person Support** - Add as many people as needed
- 🔄 **Shared Items** - Split appetizers, desserts, or any shared items among multiple people
- 💰 **Fair Fee Distribution** - Automatically splits delivery fees and discounts proportionally
- 📱 **Mobile Optimized** - Works perfectly on iOS and Android devices
- 📋 **Copy Summary** - Generate and copy a formatted summary to share with friends
- ✅ **Total Verification** - Ensures the split amounts match the original bill total

## How to Use

1. **Paste your receipt** - Copy and paste your Uber Eats receipt into the text area
2. **Parse the receipt** - Click "Parse Receipt" to extract items and totals
3. **Assign items** - Click on person circles to assign items to people
4. **Share costs** - For shared items, select multiple people to split the cost
5. **Review totals** - Check individual totals and verification summary
6. **Copy & share** - Use the "Copy Summary" button to share the breakdown

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.
