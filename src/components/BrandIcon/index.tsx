import { createIconSetFromFontello } from '@expo/vector-icons';
import fontelloConfig from '../../assets/fonts/brands_font_config.json';
import { BrandIconName } from '../../../types';

const Icon = createIconSetFromFontello(
  fontelloConfig,
  'brands', // The font family name you chose
  'brands.ttf' // Path to your .ttf file
);

interface Props {
  name: BrandIconName;
  size?: number;
  color?: string;
}

const BrandIcon: React.FC<Props> = ({ name, size, color }) => {
  return <Icon name={name} size={size ? size : 16} color={color ? color : "black"} />;
};

export default BrandIcon;
