const heroImage = `${import.meta.env.BASE_URL}scrapbook/rain-collage.webp`

/** Decoration only: never used as drawing input, analysis, or an exported image. */
export default function ScrapbookArt() {
  return (
    <figure className="scrapbook-art" aria-hidden="true">
      <div className="scrapbook-art-back" />
      <div className="scrapbook-art-sheet">
        <img className="scrapbook-art-image" src={heroImage} alt="" width={640} height={800} />
        <figcaption className="scrapbook-art-caption"><span>A little weather, a little shelter</span><span>Rain &amp; Me</span></figcaption>
      </div>
    </figure>
  )
}
