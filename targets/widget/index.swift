import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = SimpleEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
}

struct AddWordWidgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            Color(red: 0.039, green: 0.039, blue: 0.039) // #0A0A0A

            VStack(spacing: 8) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 36))
                    .foregroundColor(Color(red: 0.129, green: 0.588, blue: 0.953)) // #2196F3

                Text("Add Word")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
            }
        }
        .widgetURL(URL(string: "wrdbnk://add-word"))
    }
}

struct AddWordWidget: Widget {
    let kind: String = "AddWordWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            AddWordWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Add Word")
        .description("Quickly add a new word to your vocabulary.")
        .supportedFamilies([.systemSmall])
    }
}

@main
struct ExportWidgets: WidgetBundle {
    var body: some Widget {
        AddWordWidget()
    }
}
