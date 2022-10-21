const fs = require("fs");
const playwright = require("@playwright/test");

(async () => {
  // Setup
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const getPageReviews = async (
    page,
    { store, pageNumber = 1, sort = "recent" }
  ) => {
    await page.goto(
      `https://apps.shopify.com/${store}/reviews?page=${pageNumber}&sort_by=${sort}`
    );

    return await page.$$eval(".review-listing", (reviews) => {
      const getText = (el, selector) =>
        el?.querySelector(selector)?.textContent?.replace(/\s+/g, " ")?.trim();

      if (reviews.length === 0) {
        return null;
      }

      return reviews.map((review) => {
        if (!review) return null;

        review.querySelector('.review-content button[type="submit"]').click();

        const id = Number(
          review
            .querySelector("div[data-review-id]")
            .getAttribute("data-review-id")
        );
        const date = getText(review, ".review-metadata__item-label");
        const store = getText(review, ".review-listing-header__text");
        const content = getText(review, ".review-content p");
        const rating = getText(review, ".ui-star-rating__rating");
        const country =
          getText(
            review.querySelectorAll(".review-merchant-characteristic__item")[0],
            "span"
          ) || null;
        const timeSpentUsingApp =
          getText(
            review.querySelectorAll(".review-merchant-characteristic__item")[1],
            "span"
          ) || null;

        return {
          id,
          date,
          store,
          country,
          timeSpentUsingApp,
          content,
          rating: Number(rating.split(" ")[0]),
        };
      });
    });
  };

  const saveReviews = (reviews, fileName = "data/reviews.json") => {
    fs.readFile(fileName, "utf8", function readFileCallback(err, data) {
      if (err) {
        console.log(err);
      } else {
        obj = JSON.parse(data);
        obj = [...obj, ...reviews];
        json = JSON.stringify(obj);
        fs.writeFile(fileName, json, "utf8", (err) => {
          if (err) {
            console.log(err);
          }
        });
      }
    });
  };

  const store = "shippo";
  let pageNumber = 1;

  while (true) {
    console.log(`Getting page ${pageNumber}...`);

    const reviews = await getPageReviews(page, {
      store,
      pageNumber,
    });

    if (!reviews) {
      console.log("No more reviews");
      break;
    }

    saveReviews(reviews);

    pageNumber++;
  }

  // Teardown
  await context.close();
  await browser.close();
})();
