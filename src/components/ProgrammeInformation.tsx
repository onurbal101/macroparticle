import type { ReactNode } from "react";
import { quantityText, type ApplianceRecord, type Locale } from "../data/schema";
import { messages } from "../i18n";
import { ControlNames } from "./ControlNames";

export function ProgrammeInformation({ record, locale, embedded = false, children }: {
  record: ApplianceRecord;
  locale: Locale;
  embedded?: boolean;
  children?: ReactNode;
}) {
  const t = messages[locale];
  const Heading = embedded ? "h3" : "h2";
  const quantity = quantityText(record, locale);
  return (
    <section className={embedded ? "simulation-preparation preparation" : "surface preparation"}>
      {record.kind !== "article" ? (
        <Heading className="preparation-heading">
          {t.preparation}
          {quantity && <>{" "}<span className="heading-detail">
            <span aria-hidden="true">·</span>{" "}{quantity}
          </span></>}
        </Heading>
      ) : (
        quantity && <p><strong>{quantity}</strong></p>
      )}
      {record.accessories.length > 0 && (
        <p className="preparation-equipment">
          <strong>{t.accessories}</strong>{" "}<span aria-hidden="true">·</span>{" "}
          {record.accessories.map((text) => text[locale]).join(" ")}
        </p>
      )}
      {record.cookware.length > 0 && (
        <p className="preparation-equipment">
          <strong>{t.cookware}</strong>{" "}<span aria-hidden="true">·</span>{" "}
          {record.cookware.map((text) => text[locale]).join(" ")}
        </p>
      )}
      {record.preparation.length > 0 && (
        <ul className="preparation-list">
          {record.preparation.map((text, index) => <li key={index}><ControlNames text={text[locale]} /></li>)}
        </ul>
      )}
      {children}
    </section>
  );
}
