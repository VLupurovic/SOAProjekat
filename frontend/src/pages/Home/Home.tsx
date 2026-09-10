import Hero from "../../components/Hero/Hero";
import FeatureSection from "../../components/FeatureSection/FeatureSection";
import PopularTours from "../../components/PopularTours/PopularTours";
// import Testimonials from "../../components/Testimonials/Testimonials";
import Footer from "../../components/Footer/Footer";

import "./Home.css";

export default function Home() {
  return (
    <div className="home">

      <main>

        <Hero />

        <FeatureSection
          number="01"
          title="Discover Your Next Adventure"
          text="Explore incredible destinations and find unforgettable experiences around the world."
          image="https://images.unsplash.com/photo-1765338023018-e0c7b897f8a4?fm=jpg&q=80&w=1600&auto=format&fit=crop"
        />

        <FeatureSection
          number="02"
          title="Choose The Perfect Tour"
          text="Find a tour that fits your interests, budget and schedule."
          image="https://images.unsplash.com/photo-1741368718864-cb3650334fb9?fm=jpg&q=80&w=1600&auto=format&fit=crop"
          reverse
        />

        <PopularTours />

        {/* <Testimonials /> */}

      </main>

      <Footer />

    </div>
  );
}