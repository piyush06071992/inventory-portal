const { onRequest } = require("firebase-functions/v2/https");
const Razorpay = require("razorpay");

// Corrected keys from your spreadsheet (No spaces or newlines)
const razorpay = new Razorpay({
  key_id: "rzp_test_SWvXVaTqZIFGII",
  key_secret: "EuCW7n3LIpgs7ZS6hrPjeCAp",
});

exports.createRentOrder = onRequest({ cors: true }, async (req, res) => {
  // Respond to Preflight (handshake)
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const options = {
      amount: (req.body.amount || 500) * 100, // Converts 500 INR to 50000 paise
      currency: "INR",
      receipt: "receipt_" + Math.random().toString(36).substring(7),
    };

    const order = await razorpay.orders.create(options);
    res.status(200).send(order);
  } catch (error) {
    console.error("Razorpay Error:", error);
    res.status(500).send({ error: "Failed to create order", details: error.message });
  }
});
