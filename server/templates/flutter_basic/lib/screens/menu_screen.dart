import 'package:flutter/material.dart';

class MenuScreen extends StatelessWidget {
  final List<Map<String, dynamic>> pages;
  final Function(int) onTileTap;

  const MenuScreen({Key? key, required this.pages, required this.onTileTap})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      children: List.generate(pages.length, (index) {
        final page = pages[index];
        return GestureDetector(
          onTap: () => onTileTap(index),
          child: Card(
            margin: const EdgeInsets.all(16),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.apps,
                      size: 48, color: Theme.of(context).primaryColor),
                  const SizedBox(height: 8),
                  Text(page['title'] ?? 'Stránka', textAlign: TextAlign.center),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }
}
