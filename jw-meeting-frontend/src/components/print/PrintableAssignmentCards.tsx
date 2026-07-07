import "./printable-assignment-cards.css";

export interface AssignmentCardData {
  id: string;
  name: string;
  assistant: string;
  date: string;
  weekDate?: string;
  interventionNumber: string;
  description: string;
  assigneeId?: string;
}

const noteText =
  "En la Guía de actividades encontrará toda la información que necesita para su intervención. " +
  "Repase también las indicaciones que se describen en las Instrucciones para la reunión Vida y Ministerio Cristianos (S-38).";

const chunkCards = (cards: AssignmentCardData[], size: number) => {
  const chunks: AssignmentCardData[][] = [];
  for (let i = 0; i < cards.length; i += size) {
    chunks.push(cards.slice(i, i + size));
  }
  return chunks;
};

interface PrintableAssignmentCardsProps {
  cards: AssignmentCardData[];
  selectable?: boolean;
  selectedCardIds?: Set<string>;
  onToggleCardSelection?: (cardId: string) => void;
  registerCardRef?: (cardId: string, node: HTMLDivElement | null) => void;
}

export const PrintableAssignmentCards = ({
  cards,
  selectable = false,
  selectedCardIds,
  onToggleCardSelection,
  registerCardRef,
}: PrintableAssignmentCardsProps) => {
  const pages = chunkCards(cards, 4);

  return (
    <div className="cards-scope">
      {pages.map((page, index) => (
        <div key={`page-${index}`} className="cards-page">
          {page.map((card) => (
            <div
              key={card.id}
              className={`card ${selectable ? "card-selectable" : ""} ${
                selectedCardIds?.has(card.id) ? "card-selected" : ""
              }`}
              ref={(node) => registerCardRef?.(card.id, node)}
            >
              {selectable ? (
                <button
                  type="button"
                  className="card-selector no-print no-export"
                  onClick={() => onToggleCardSelection?.(card.id)}
                  aria-label={
                    selectedCardIds?.has(card.id)
                      ? `Quitar tarjeta de ${card.name}`
                      : `Seleccionar tarjeta de ${card.name}`
                  }
                >
                  <span className="card-selector-box">{selectedCardIds?.has(card.id) ? "✓" : ""}</span>
                </button>
              ) : null}

              <div className="card-header">
                ASIGNACIÓN PARA LA REUNIÓN
                <br />
                VIDA Y MINISTERIO CRISTIANOS
              </div>

              <div className="field">
                <span className="field-label">Nombre:</span>
                <span className="field-line">{card.name}</span>
              </div>

              <div className="field">
                <span className="field-label">Ayudante:</span>
                <span className="field-line">{card.assistant}</span>
              </div>

              <div className="field">
                <span className="field-label">Fecha:</span>
                <span className="field-line">{card.date}</span>
              </div>

              <div className="field">
                <span className="field-label">Intervención núm.:</span>
                <span className="field-line">
                  {card.interventionNumber}. {card.description}
                </span>
              </div>

              <div className="checkbox-section">
                <div className="checkbox-title">Se presentará en:</div>
                <div className="checkbox-option">
                  <span className="checkbox checked" />
                  <span>Sala principal</span>
                </div>
                <div className="checkbox-option">
                  <span className="checkbox" />
                  <span>Sala auxiliar núm. 1</span>
                </div>
                <div className="checkbox-option">
                  <span className="checkbox" />
                  <span>Sala auxiliar núm. 2</span>
                </div>
              </div>

              <div className="note-section">
                <div className="note-title">Nota al estudiante:</div>
                <div className="note-text">{noteText}</div>
                <div className="footer">S-89-S 11/23</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
