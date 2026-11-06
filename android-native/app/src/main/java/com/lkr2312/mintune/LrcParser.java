package com.lkr2312.mintune;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class LrcParser {
    private static final Pattern TIME = Pattern.compile("\\[(\\d{2}):(\\d{2})[.:](\\d{2,3})\\]");
    private LrcParser() {}
    public static List<Line> parse(String content) { List<Line> result = new ArrayList<>(); if (content == null) return result; for (String raw : content.split("\\r?\\n")) { Matcher matcher = TIME.matcher(raw); List<Long> times = new ArrayList<>(); String text = raw.replaceAll("\\[\\d{2}:\\d{2}[.:]\\d{2,3}\\]", "").trim(); if (text.isEmpty()) continue; while (matcher.find()) { long minute = Long.parseLong(matcher.group(1)); long second = Long.parseLong(matcher.group(2)); String fraction = matcher.group(3); long millis = fraction.length() == 2 ? Long.parseLong(fraction) * 10 : Long.parseLong(fraction); times.add(minute * 60000 + second * 1000 + millis); } for (Long time : times) result.add(new Line(time, text)); } Collections.sort(result, Comparator.comparingLong(line -> line.timestampMs)); return result; }
    public static int currentIndex(List<Line> lines, long positionMs) { int low = 0, high = lines.size() - 1, answer = -1; while (low <= high) { int middle = (low + high) >>> 1; if (lines.get(middle).timestampMs <= positionMs) { answer = middle; low = middle + 1; } else high = middle - 1; } return answer; }
    public static final class Line { public final long timestampMs; public final String text; public Line(long timestampMs, String text) { this.timestampMs = timestampMs; this.text = text; } }
}
