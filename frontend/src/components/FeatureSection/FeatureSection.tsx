import "./FeatureSection.css";

interface FeatureSectionProps {
  number: string;
  title: string;
  text: string;
  image: string;
  reverse?: boolean;
}

export default function FeatureSection({
  number,
  title,
  text,
  image,
  reverse = false,
}: FeatureSectionProps) {
  return (
    <section
      className={`feature-section ${
        reverse ? "feature-reverse" : ""
      }`}
    >

      <div className="feature-text">

        <span className="feature-number">
          {number}
        </span>

        <div className="feature-content">

          <p className="feature-label">
            EXPLORE
          </p>

          <h2>{title}</h2>

          <p>{text}</p>

        </div>

      </div>

      <div className="feature-image">
        <img src={image} alt={title} />
      </div>

    </section>
  );
}