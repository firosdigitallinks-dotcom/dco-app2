import type { Metadata } from "next";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { WhatsAppIcon } from "../components/WhatsAppIcon";
import { getSiteData } from "../db/site";
import { withBasePath } from "../lib/base-path";
import { whatsappLink } from "../lib/links";
import { buildPageMetadata } from "../lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  return buildPageMetadata({
    settings: data.setting,
    fallbackTitle: "Cleaning Material Supplier in Oman | Diamond Capital Oasis",
    fallbackDescription:
      "From cleaning materials and disinfectants to safety equipment, tissue products and washroom essentials, Diamond Capital Oasis supports businesses across Oman with dependable product supply.",
    canonicalPath: "/",
  });
}

const productCategories = [
  {
    title: "1. Safety Equipment",
    description:
      "Workplace safety essentials, including protective gloves, masks and other personal protective equipment.",
  },
  {
    title: "2. Disinfectants and Sanitising Products",
    description:
      "Disinfectant solutions and sanitising products for maintaining hygiene across commercial and institutional spaces.",
  },
  {
    title: "3. Waste Bins and Waste Management Products",
    description:
      "Indoor and outdoor bins, waste segregation bins and specialised waste collection solutions.",
  },
  {
    title: "4. Tissue Products",
    description:
      "Toilet rolls, maxi rolls, facial tissues and other everyday tissue essentials.",
  },
  {
    title: "5. Garbage Bags and Waste Bags",
    description:
      "Garbage bags, heavy-duty waste bags and biohazard waste bags for different disposal requirements.",
  },
  {
    title: "6. Hand Hygiene Products",
    description:
      "Hand soaps, sanitising products and hand hygiene essentials.",
  },
  {
    title: "7. Cleaning Tools and Accessories",
    description:
      "Mops, brushes, cleaning cloths and other janitorial accessories.",
  },
  {
    title: "8. Industrial Cleaning Supplies",
    description:
      "Cleaning essentials for factories, warehouses, workshops and industrial facilities.",
  },
  {
    title: "9. Washroom Supplies",
    description:
      "Soap dispensers, tissue dispensers and other washroom accessories.",
  },
  {
    title: "10. Cable Ties and Accessories",
    description:
      "Stainless steel cable ties and other useful maintenance accessories.",
  },
];

const featuredProducts = [
  {
    name: "Disinfectant",
    description: "Cleaning and hygiene solutions for different surfaces.",
    image: "/imported-products/disinfectant.jpg",
  },
  {
    name: "Hand Soap",
    description: "Essential handwashing products for commercial washrooms.",
    image: "/imported-products/hand-soap-hi-care.png",
  },
  {
    name: "Waste Segregation Bins",
    description: "Practical solutions for organised waste disposal.",
    image: "/imported-products/ashtray-bins.png",
  },
  {
    name: "Biohazard Waste Bags",
    description: "Waste collection bags for specialised disposal requirements.",
    image: "/imported-products/biohazard-waste-bag.jpg",
  },
  {
    name: "Maxi Roll Tissue",
    description: "Tissue products for high-usage commercial environments.",
    image: "/imported-products/maxi-rollm-tork.jpg",
  },
  {
    name: "Toilet Rolls",
    description: "Everyday washroom essentials.",
    image: "/imported-products/toilet-roll.png",
  },
  {
    name: "Cotton Mop",
    description: "Suitable for routine floor cleaning.",
    image: "/imported-products/cotton-mop-gr-450-and-band-mm-50.jpg",
  },
  {
    name: "Stainless Steel Cable Ties",
    description: "Durable fastening accessories for industrial applications.",
    image: "/imported-products/hygiene-links-uv-protected-cable-ties.jpg",
  },
];

const industries = [
  "Disinfectant solutions",
  "Hand wash and liquid soap",
  "Waste segregation bins",
  "Biohazard waste bags",
  "Maxi roll tissue",
  "Toilet rolls",
  "Cotton mops",
  "Stainless steel cable ties",
];

const whyChooseUs = [
  {
    title: "Supply Beyond Major Cities",
    description:
      "We serve businesses across multiple locations, including smaller towns and remote areas of Oman.",
  },
  {
    title: "Bulk and Scheduled Supply",
    description:
      "Enquire about bulk orders and scheduled supplies to support your regular business requirements.",
  },
  {
    title: "Complete Product Range",
    description:
      "Find cleaning materials, washroom products, tissue supplies, waste management essentials and safety items from one supplier.",
  },
  {
    title: "Solutions for Different Industries",
    description:
      "Our product selection caters to hospitality, healthcare, retail and industrial cleaning requirements.",
  },
  {
    title: "Convenient Enquiries",
    description:
      "Connect with our team through phone and WhatsApp to discuss your requirements.",
  },
  {
    title: "Wide Location Coverage",
    description:
      "Our supply network covers 14 locations across different regions of Oman.",
  },
];

const howWeWork = [
  {
    step: "Step 1",
    title: "Find Your Location",
    description:
      "Visit your town's location page and explore the available product categories.",
  },
  {
    step: "Step 2",
    title: "Send Your List",
    description:
      "Share your required products and quantities through our website, WhatsApp or phone.",
  },
  {
    step: "Step 3",
    title: "Get Your Quote",
    description:
      "Our team will provide relevant pricing and delivery details based on your location and requirements.",
  },
  {
    step: "Step 4",
    title: "Arrange Delivery",
    description:
      "Confirm your order and coordinate one-time, bulk or scheduled supply arrangements.",
  },
];

const locations = [
  {
    region: "Dakhiliyah",
    places: "Fanja, Bidbid, Izki",
  },
  {
    region: "Sharqiyah",
    places: "Bidiyah, Sinaw, Al Kamil, Al Ashkhara, Jalan Bani Bu Ali",
  },
  {
    region: "Coast and South",
    places: "Quriyat, Duqm, Salalah",
  },
  {
    region: "Border and North",
    places: "Buraimi, Liwa, Shinas",
  },
];

const faqs = [
  {
    question: "1. Do you deliver cleaning supplies to towns outside Muscat?",
    answer:
      "Yes, Diamond Capital Oasis serves multiple towns beyond Muscat, including locations in Dakhiliyah, Sharqiyah, Dhofar, Al Wusta and Al Buraimi. Contact our team to enquire about product availability and delivery arrangements for your location.",
  },
  {
    question: "2. What is the minimum order for delivery to my town?",
    answer:
      "Minimum order requirements may depend on the products, quantities and delivery location. Share your requirements with our team to understand the applicable order conditions and delivery arrangements before confirming your purchase.",
  },
  {
    question: "3. Can you supply hotels, camps and industrial sites in bulk?",
    answer:
      "Yes, businesses can enquire about bulk cleaning materials, hospitality housekeeping supplies, tissue products, disinfectants and waste management essentials. Our team can discuss suitable supply arrangements based on your business requirements.",
  },
  {
    question: "4. Do you supply safety equipment as well as cleaning products?",
    answer:
      "Yes, you can enquire about safety equipment alongside cleaning materials, disinfectants, janitorial supplies and washroom essentials. Contact our team to know more about the available products and suitable options for your workplace.",
  },
  {
    question: "5. How can I request a quotation?",
    answer:
      "You can request a quotation through our website enquiry form, WhatsApp or phone. Share your company details, location, required products and quantities to help our team understand your needs and provide relevant pricing information.",
  },
];

export default async function Home() {
  const data = await getSiteData();
  const { setting } = data;
  const whatsapp = setting.whatsapp ?? "971505689879";

  return (
    <>
      <SiteHeader settings={setting} />
      <main>
        {/* Section 1 – Hero Section */}
        <section className="hero hero--dco" id="hero">
          <div className="hero-orb hero-orb--one" />
          <div className="hero-orb hero-orb--two" />
          <div className="shell hero__inner">
            <div className="hero__copy">
              <p className="eyebrow">
                <span />
                Diamond Capital Oasis · Division of Hygiene Links
              </p>
              <h1>Cleaning Material Supplier in Oman</h1>
              <p className="hero__tagline">
                Your Reliable Partner for Cleaning, Hygiene and Safety Supplies
              </p>
              <p className="hero__lead">
                From cleaning materials and disinfectants to safety equipment,
                tissue products and washroom essentials, Diamond Capital Oasis
                supports businesses across Oman with dependable product supply.
              </p>
              <div className="hero__actions">
                <a
                  className="button button--primary button--large"
                  href={withBasePath("/contact.html")}
                >
                  Request a Quote <span>↗</span>
                </a>
                <a
                  className="button button--outline button--large"
                  href={withBasePath("/contact.html")}
                >
                  Contact Us <span>↗</span>
                </a>
              </div>
              <div className="hero__proof">
                <div className="avatar-stack" aria-hidden="true">
                  <span>FM</span>
                  <span>HC</span>
                  <span>HO</span>
                </div>
                <p>
                  <strong>Trusted by professional teams</strong>
                  <span>Facilities · Healthcare · Hospitality</span>
                </p>
              </div>
            </div>

            <div className="hero-showcase" aria-label="Featured Diamond Capital Oasis products">
              <div className="showcase-grid" />
              <div className="showcase-label">
                <span>REGIONAL CATALOG</span>
                <strong>{setting.catalog_claim ?? "500+"}</strong>
                <small>PRODUCTS</small>
              </div>
              <div className="showcase-products">
                <article className="showcase-product showcase-product--cleaner">
                  <span className="showcase-product__tag">IN-HOUSE FORMULA</span>
                  <img
                    src={withBasePath("/products/floor-cleaner.jpg")}
                    alt="Floor and bathroom cleaner"
                    width="197"
                    height="334"
                  />
                  <div>
                    <span>Cleaning chemicals</span>
                    <strong>Facility care</strong>
                  </div>
                </article>
                <article className="showcase-product showcase-product--tissue">
                  <img
                    src={withBasePath("/products/maxi-roll.png")}
                    alt="Maxi paper roll"
                    width="104"
                    height="147"
                  />
                  <div>
                    <span>Manufactured</span>
                    <strong>Tissue & paper</strong>
                  </div>
                </article>
                <article className="showcase-product showcase-product--can">
                  <img
                    src={withBasePath("/products/jerry-can.jpg")}
                    alt="Plastic jerry can"
                    width="130"
                    height="125"
                  />
                  <div>
                    <span>Custom options</span>
                    <strong>Jerry cans</strong>
                  </div>
                </article>
                <article className="showcase-product showcase-product--bags">
                  <img
                    src={withBasePath("/imported-products/garbage-bag-transparent.png")}
                    alt="Professional garbage bags"
                    width="146"
                    height="148"
                  />
                  <div>
                    <span>Commercial essentials</span>
                    <strong>Garbage bags</strong>
                  </div>
                </article>
                <article className="showcase-product showcase-product--dispenser">
                  <img
                    src={withBasePath("/imported-products/soap-dispenser-steel.png")}
                    alt="Stainless steel soap dispenser"
                    width="104"
                    height="149"
                  />
                  <div>
                    <span>Washroom care</span>
                    <strong>Dispensers</strong>
                  </div>
                </article>
              </div>
              <div className="showcase-since">
                <img
                  src={withBasePath("/brand/dco-mark.png")}
                  alt="Diamond Capital Oasis mark"
                  width="48"
                  height="48"
                />
                <span>
                  Established
                  <strong>Since 2006</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 – About Us */}
        <section className="section section--about-dco" id="about-us">
          <div className="shell">
            <div className="about-dco__card">
              <div className="about-dco__content">
                <p className="eyebrow">About Us</p>
                <h2>Cleaning Supplies Delivered Beyond the City</h2>
                <div className="about-dco__text">
                  <p>
                    Diamond Capital Oasis, a division of Hygiene Links, is a
                    reliable Cleaning Material Supplier in Oman, offering
                    essential cleaning, hygiene and workplace supplies to
                    businesses across the country.
                  </p>
                  <p>
                    We serve customers in Dakhiliyah, Sharqiyah, Dhofar, Al Wusta
                    and Al Buraimi, helping hotels, commercial establishments,
                    industrial sites and institutions source their regular
                    cleaning and maintenance requirements.
                  </p>
                  <p>
                    With a focus on product availability, bulk supply and
                    dependable service, we make it easier for businesses to
                    manage their cleaning and hygiene needs through one
                    supplier.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 – Product Categories */}
        <section className="section section--mist" id="product-categories">
          <div className="shell">
            <div className="section-heading">
              <p className="eyebrow">Product Categories</p>
              <h2>Cleaning Materials and Janitorial Products</h2>
              <p className="section-heading__sub">
                Complete Cleaning, Hygiene and Safety Solutions
              </p>
              <p>
                We supply a wide range of products to support commercial,
                industrial and institutional requirements.
              </p>
            </div>
            <div className="dco-category-grid">
              {productCategories.map((category) => (
                <a
                  key={category.title}
                  href={withBasePath("/catalog.html")}
                  className="dco-category-item"
                >
                  <div className="dco-category-item__body">
                    <h3>{category.title}</h3>
                    <p>{category.description}</p>
                  </div>
                  <span className="dco-category-item__arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 – Featured Products */}
        <section className="section" id="featured-products">
          <div className="shell">
            <div className="section-heading">
              <p className="eyebrow">Featured Products</p>
              <h2>Our Best-Selling Products</h2>
              <p>
                Discover essential cleaning, hygiene and maintenance products
                for your business.
              </p>
            </div>
            <div className="dco-product-grid">
              {featuredProducts.map((product) => (
                <article key={product.name} className="dco-product-card">
                  <div className="dco-product-card__image-wrap">
                    <img
                      src={withBasePath(product.image)}
                      alt={product.name}
                      width={300}
                      height={300}
                      loading="lazy"
                    />
                  </div>
                  <div className="dco-product-card__body">
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="dco-product-card__action">
                      <a
                        className="button button--outline button--small"
                        href={withBasePath("/contact.html")}
                      >
                        Enquire Now
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="dco-section-action">
              <a
                className="button button--primary button--large"
                href={withBasePath("/contact.html")}
              >
                Enquire Now <span>↗</span>
              </a>
            </div>
          </div>
        </section>

        {/* Section 5 – Industries We Serve */}
        <section className="section section--mist" id="industries">
          <div className="shell">
            <div className="section-heading">
              <p className="eyebrow">Industries We Serve</p>
              <h2>Supplies for Hotels, Camps, Industry and Retail</h2>
              <p className="section-heading__sub">
                Essential Products for Everyday Operations
              </p>
              <p>
                Explore some of our key cleaning, hygiene and maintenance
                products.
              </p>
            </div>
            <div className="industry-grid">
              {industries.map((item, index) => (
                <div key={item} className="dco-industry-card">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{item}</h3>
                  </div>
                </div>
              ))}
            </div>
            <div className="dco-section-action">
              <a
                className="button button--primary button--large"
                href={withBasePath("/contact.html")}
              >
                Enquire About Our Products <span>↗</span>
              </a>
            </div>
          </div>
        </section>

        {/* Section 6 – Why Choose Us? */}
        <section className="section" id="why-choose-us">
          <div className="shell">
            <div className="section-heading">
              <p className="eyebrow">Why Choose Us?</p>
              <h2>
                Why Customers Across Oman's Towns Choose Diamond Capital Oasis
              </h2>
            </div>
            <div className="dco-why-grid">
              {whyChooseUs.map((item, index) => (
                <article key={item.title} className="dco-why-card">
                  <span className="dco-why-card__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="dco-why-card__body">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Section 7 – How We Work */}
        <section className="section section--mist" id="how-we-work">
          <div className="shell">
            <div className="section-heading">
              <p className="eyebrow">How We Work</p>
              <h2>How We Deliver to Your Town</h2>
              <p>
                Getting your cleaning supplies is simple with Diamond Capital
                Oasis.
              </p>
            </div>
            <div className="dco-steps-grid">
              {howWeWork.map((step) => (
                <div key={step.step} className="dco-step-card">
                  <span className="dco-step-card__num">{step.step}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
            <div className="dco-section-action">
              <a
                className="button button--primary button--large"
                href={withBasePath("/contact.html")}
              >
                Start Your Enquiry <span>↗</span>
              </a>
            </div>
          </div>
        </section>

        {/* Section 8 – Locations We Serve */}
        <section className="section" id="locations">
          <div className="shell">
            <div className="section-heading">
              <p className="eyebrow">Locations We Serve</p>
              <h2>Where We Deliver</h2>
              <p>
                Diamond Capital Oasis supplies cleaning materials, hygiene
                products, tissue supplies and housekeeping essentials across 14
                locations in Oman. Explore our location pages to find relevant
                products and enquire about supply options in your area.
              </p>
            </div>
            <div className="dco-locations-grid">
              {locations.map((loc) => (
                <div key={loc.region} className="dco-location-card">
                  <div className="dco-location-card__header">
                    <span className="dco-location-card__pin" aria-hidden="true">
                      📍
                    </span>
                    <h3>{loc.region}</h3>
                  </div>
                  <p>{loc.places}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 9 – Frequently Asked Questions */}
        <section className="section section--mist" id="faq">
          <div className="shell">
            <div className="section-heading">
              <p className="eyebrow">Frequently Asked Questions</p>
              <h2>Frequently Asked Questions</h2>
            </div>
            <div className="dco-faq-list">
              {faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  className="faq-item"
                  open={index === 0}
                >
                  <summary className="faq-item__question">
                    <div className="faq-item__header">
                      <span className="faq-item__tag">FAQ {index + 1}</span>
                      <h3 className="faq-item__title">{faq.question}</h3>
                    </div>
                    <span className="faq-item__toggle" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <div className="faq-item__answer">
                    <p>{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Section 10 – Final CTA and Enquiry Form */}
        <section className="section" id="quote">
          <div className="shell">
            <div className="dco-final-cta-card">
              <div className="dco-final-cta-content">
                <p className="eyebrow">Final CTA and Enquiry Form</p>
                <h2>Request a Quote for Your Site</h2>
                <p>
                  Need a reliable Cleaning Material Supplier in Oman? Contact
                  Diamond Capital Oasis for cleaning materials, safety products
                  and housekeeping supplies. Share your requirements and get in
                  touch with our team today.
                </p>
                <div className="dco-final-cta-actions">
                  <a
                    className="button button--primary button--large"
                    href={withBasePath("/contact.html")}
                  >
                    Request a Quote <span>↗</span>
                  </a>
                  <a
                    className="button button--whatsapp button--large"
                    href={whatsappLink(whatsapp, {
                      product: "Cleaning Material Supplier in Oman",
                    })}
                  >
                    <WhatsAppIcon />
                    WhatsApp Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter settings={setting} />
    </>
  );
}
