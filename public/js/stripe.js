/* eslint-disable */
import axios from "axios";
import { showAlert } from "./alerts";

export const bookTour = async (tourId) => {
  const stripe = Stripe(
    "pk_test_51LRYurSEMUDxlO1rcZaBOuFOPf11KbGqQfTmiT5jWt6h4ZL2lzhRaPjpId43Xpdp81Q6S77nKUvfnGn35RG0YFqn004eHQ5eqN"
  );

  try {
    // Get checkout-session from the API
    const res = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(res);

    // 2. Create checkout-form + charge credit-card
    await stripe.redirectToCheckout({
      sessionId: res.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert("error", err.message);
  }
};
