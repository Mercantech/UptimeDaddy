import { Card, CardContent, CardHeader, CardDescription, Icon } from "semantic-ui-react";

const accentMap = {
  green:  { border: "#408A71", iconColor: "#4ea584", iconBg: "#408A7126" },
  yellow: { border: "#c9a84c", iconColor: "#c9a84c", iconBg: "#c9a84c26" },
  red:    { border: "#c94c4c", iconColor: "#c94c4c", iconBg: "#c94c4c26" },
  blue:   { border: "#4c8ec9", iconColor: "#4c8ec9", iconBg: "#4c8ec926" },
};

function Cards({ items = [] }) {
  return (
    <Card.Group itemsPerRow={3} stackable className="cards-container">
      {items.map((item, index) => {
        const accent = accentMap[item.accent] ?? accentMap.green;
        return (
          <Card
            key={`${item.header}-${index}`}
            style={{
              backgroundColor: "#0f1f1c",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              borderLeft: `4px solid ${accent.border}`,
              padding: "0.5em",
            }}
          >
            <CardContent>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <CardDescription style={{ color: accent.iconColor, fontSize: "1rem" }}>
                  {item.description}
                </CardDescription>
                {item.icon && (
                  <div style={{
                    backgroundColor: accent.iconBg,
                    borderRadius: "0.5rem",
                    width : "2.5rem",
                    height: "2.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    }}>
                    <Icon name={item.icon} style={{ color: accent.iconColor, margin: 0, display: "block", lineHeight: "1" }} />
                  </div>
                )}
              </div>
              <CardHeader style={{fontWeight: 700, fontSize: "2rem", color: "#e8fff6" }}>
                {item.header}
              </CardHeader>
              {item.trend && (
                <div style={{ marginTop: "0.4rem", fontSize: "0.85rem", color: accent.iconColor }}>
                  {item.trend}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Card.Group>
  );
}

export default Cards;