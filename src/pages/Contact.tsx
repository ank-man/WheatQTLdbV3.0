import { Mail, MapPin, Github } from 'lucide-react'
import PageHero from '../components/PageHero'

export default function Contact() {
  return (
    <div>
      <PageHero
        eyebrow="Get in touch"
        title="Contact"
        subtitle="Questions, data submissions, errata or collaboration enquiries are welcome."
        image="wheat-field-gbif.jpg"
        variant="side"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <h3 className="font-semibold text-wheat-900 dark:text-wheat-50">Mailing address</h3>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-wheat-600" />
            Department of Genetics &amp; Plant Breeding,<br />
            Ch. Charan Singh University, Meerut – 250004, India
          </p>
          <p className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-wheat-600" />
            <a className="underline" href="mailto:pkgupta36@gmail.com">pkgupta36@gmail.com</a>
          </p>
          <p className="flex items-center gap-2 text-sm">
            <Github className="h-4 w-4 text-wheat-600" />
            <a className="underline" href="https://github.com/" target="_blank" rel="noreferrer">Open an issue / PR on GitHub</a>
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-wheat-200 dark:border-wheat-700">
          <iframe
            title="CCS University, Meerut"
            src="https://www.google.com/maps?q=Chaudhary+Charan+Singh+University+Meerut&output=embed"
            className="h-72 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  )
}
