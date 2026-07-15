import re

df = {"Height": [200, 400, 600],
      "Name": ["John", "Margaret", "Thomas"],
      "Eircode": ["N91YA38", "N91RZ23", "D04P288"]}

for i in range(0, len(df)):
    m = re.match(r"(N91.*)", df["Eircode"][i])

    if m:
        print(m.group(0), m.group(1))